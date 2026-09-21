const test = require('node:test');
const assert = require('node:assert/strict');
const { telemetry, numeric } = require('../src/domain/assetTelemetry');

test('telemetria distingue zero, desconhecido e valor inválido', () => {
  assert.equal(numeric(null), null);
  assert.equal(numeric(''), null);
  const actual = telemetry({ metrics: { cpuUsagePercent: 0, ramUsagePercent: 101, systemDiskUsagePercent: 93.4, uptimeHours: 12 }, security: { firewall: { status: 'UNKNOWN' }, defender: { signaturesUpdated: false } } });
  assert.deepEqual(actual, { cpu: 0, ram: null, disk: 93.4, uptime: 12, firewall: null, antivirus: false });
  assert.deepEqual(telemetry({}), { cpu: null, ram: null, disk: null, uptime: null, firewall: null, antivirus: null });
});

function controller(duplicate = false) {
  const calls = [];
  const client = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT inventory_json')) return { rows: [{ inventory_json: null }] };
    if (sql.includes('INSERT INTO ativo_snapshots')) return { rows: duplicate ? [] : [{ id: 31 }] };
    return { rows: [] };
  }, release() {} };
  const database = require.resolve('../src/config/database');
  require.cache[database] = { id: database, filename: database, loaded: true, exports: { connect: async () => client, query: client.query } };
  const file = require.resolve('../src/controllers/assetController');
  delete require.cache[file];
  return { controller: require(file), calls };
}
const sample = () => ({ schemaVersion: 1, reportId: 'sample', collectedAt: '2026-09-21T15:00:00Z', agentVersion: '2.0.1', hostname: 'PC-TEST',
  storage: { totalBytes: 1000, freeBytes: 0 },
  metrics: { cpuUsagePercent: 91, ramUsagePercent: 67, systemDiskUsagePercent: 100, uptimeHours: 48 },
  security: { defender: { status: 'ENABLED', signaturesUpdated: false }, firewall: { status: 'DISABLED' } },
});
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }

test('inventário atualiza métricas e segurança do painel e grava o histórico', async () => {
  const { controller: c, calls } = controller();
  const res = response();
  await c.reportInventory({ body: sample(), asset: { id: 7 } }, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.ok, true);
  const update = calls.find(call => call.sql.startsWith('UPDATE ativos SET hostname'));
  assert.equal(update.values[9], 0, 'disco totalmente cheio mantém zero bytes livres');
  assert.deepEqual(update.values.slice(18), [100, 'warning', 7, 91, 67, 48, false, false]);
  for (const expression of ['cpu_usage=$22', 'ram_usage=$23', 'uptime_hours=$24', 'antivirus_atualizado=$25', 'firewall_enabled=$26']) assert.ok(update.sql.includes(expression));
  assert.deepEqual(calls.find(call => call.sql.includes('INSERT INTO ativo_metricas')).values, [7, 91, 67, 100]);
});

test('reenvio do mesmo report não duplica as métricas', async () => {
  const { controller: c, calls } = controller(true);
  const res = response();
  await c.reportInventory({ body: sample(), asset: { id: 7 } }, res);
  assert.equal(res.body.duplicate, true);
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO ativo_metricas')), false);
});

test('coleta parcial não vira medição de zero no painel', async () => {
  const { controller: c, calls } = controller();
  await c.reportInventory({ body: { schemaVersion: 1, collectedAt: '2026-09-21T15:00:00Z', agentVersion: '2.0.1', hostname: 'PC' }, asset: { id: 7 } }, response());
  assert.deepEqual(calls.find(call => call.sql.includes('INSERT INTO ativo_metricas')).values, [7, null, null, null]);
});
