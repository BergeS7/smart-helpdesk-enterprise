const test = require('node:test');
const assert = require('node:assert/strict');
const { businessMinutesBetween } = require('../src/domain/businessHours');

// Exclusivamente um banco descartável fornecido pelo executor dos testes.
test('PostgreSQL: calendário, migração, prioridades e pausas em dois fusos de sessão', {
  skip: !process.env.SLA_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.SLA_TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TEMP TABLE chamados (
      id int, status text, primeira_resposta_em timestamp, sla_pausado_em timestamp,
      sla_limite_resposta timestamp, sla_limite_resolucao timestamp
    )`);
    await client.query(`INSERT INTO chamados VALUES
      (1, 'OPEN', NULL, NULL, CURRENT_TIMESTAMP + interval '2 hours', CURRENT_TIMESTAMP + interval '2 hours'),
      (2, 'CLOSED', CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (3, 'OPEN', NULL, NULL, CURRENT_TIMESTAMP - interval '1 hour', CURRENT_TIMESTAMP - interval '1 hour'),
      (4, 'WAITING_USER', NULL, CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP - interval '22 hours', CURRENT_TIMESTAMP - interval '22 hours'),
      (5, 'IN_PROGRESS', CURRENT_TIMESTAMP - interval '1 hour', NULL, CURRENT_TIMESTAMP - interval '2 hours', CURRENT_TIMESTAMP + interval '2 hours')`);
    const before = await client.query('SELECT * FROM chamados ORDER BY id');
    await require('../migrations/1790000000000_business_hours_sla').up({ sql: (sql) => client.query(sql) });
    const after = await client.query('SELECT * FROM chamados ORDER BY id');
    assert.deepEqual(after.rows[1], before.rows[1], 'histórico encerrado intacto');
    assert.deepEqual(after.rows[2], before.rows[2], 'vencimento anterior preservado');
    const balance = await client.query('SELECT sla_business_seconds(CURRENT_TIMESTAMP::timestamp, sla_limite_resolucao) AS seconds FROM chamados WHERE id=1');
    assert.equal(balance.rows[0].seconds, 7200);
    const pausedBalance = await client.query('SELECT sla_business_seconds(sla_pausado_em, sla_limite_resolucao) AS seconds FROM chamados WHERE id=4');
    assert.equal(pausedBalance.rows[0].seconds, 7200, 'saldo congelado usa a referência de pausa');
    assert.deepEqual(after.rows[4].sla_limite_resposta, before.rows[4].sla_limite_resposta, 'primeira resposta registrada preserva seu prazo');

    for (const zone of ['UTC', 'America/Fortaleza']) {
      await client.query(`SELECT set_config('TimeZone', $1, true)`, [zone]);
      const add = async (start, seconds) => {
        const { rows } = await client.query(`SELECT to_char(sla_add_business_seconds($1::timestamptz::timestamp, $2)::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS result`, [start, seconds]);
        return rows[0].result;
      };
      const between = async (a, b) => (await client.query('SELECT sla_business_seconds($1::timestamptz::timestamp, $2::timestamptz::timestamp) AS result', [a, b])).rows[0].result;
      assert.equal(await add('2026-09-25T17:00:00-03:00', 7200), '2026-09-26T12:00:00Z');
      assert.equal(await add('2026-09-26T11:00:00-03:00', 7200), '2026-09-28T12:00:00Z');
      assert.equal(await add('2026-09-27T10:00:00-03:00', 3600), '2026-09-28T12:00:00Z');
      assert.equal(await add('2026-09-21T18:00:00-03:00', 3600), '2026-09-22T12:00:00Z');
      assert.equal(await add('2026-09-28T09:00:00-03:00', -7200), '2026-09-26T14:00:00Z');
      assert.equal(await add('2026-09-26T11:00:00-03:00', 3600), '2026-09-26T15:00:00Z');
      assert.equal(await add('2026-09-21T11:00:00-03:00', 7200), '2026-09-21T18:00:00Z');
      assert.equal(await add('2026-09-21T13:00:00-03:00', 3600), '2026-09-21T18:00:00Z');
      assert.equal(await add('2026-09-21T15:00:00-03:00', -7200), '2026-09-21T14:00:00Z');
      assert.equal(await add('2026-09-21T13:00:00-03:00', -3600), '2026-09-21T14:00:00Z');
      assert.equal(await between('2026-09-21T08:00:00-03:00', '2026-09-21T18:00:00-03:00'), 8 * 3600);
      assert.equal(await between('2026-09-21T12:00:00-03:00', '2026-09-21T14:00:00-03:00'), 0);
      // Pausa que atravessa o fechamento: só os 90 minutos úteis são creditados.
      const pause = await between('2026-09-25T17:30:00-03:00', '2026-09-26T09:00:00-03:00');
      assert.equal(pause, 5400);
      assert.equal(await add('2026-09-26T09:00:00-03:00', pause), '2026-09-26T13:30:00Z');
      assert.equal(await between('2026-09-26T12:00:00-03:00', '2026-09-28T08:00:00-03:00'), 0);
      for (let i = 0; i < 20; i++) {
        const start = new Date(Date.UTC(2026, 8, 21, i, 15)).toISOString();
        const seconds = (i + 1) * 900;
        const end = await add(start, seconds);
        assert.equal(await between(start, end), seconds);
        assert.equal(businessMinutesBetween(start, end) * 60, seconds, 'SQL e contador concordam');
      }
    }
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
