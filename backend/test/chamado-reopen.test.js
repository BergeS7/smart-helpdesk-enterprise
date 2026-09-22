const test = require('node:test');
const assert = require('node:assert/strict');
const { REOPEN_WINDOW_DAYS, reopenDeadline, isReopenWindowOpen } = require('../src/domain/ticketStatus');

test('reopenDeadline soma a janela de reabertura à data de conclusão', () => {
  assert.equal(REOPEN_WINDOW_DAYS, 7);
  assert.equal(reopenDeadline(null), null);
  assert.equal(reopenDeadline('data inválida'), null);
  assert.equal(reopenDeadline('2026-09-01T10:00:00Z').toISOString(), '2026-09-08T10:00:00.000Z');
});

test('isReopenWindowOpen é true dentro do prazo e false depois', () => {
  const finalizado = '2026-09-01T10:00:00Z';
  assert.equal(isReopenWindowOpen(finalizado, new Date('2026-09-08T10:00:00Z')), true, 'no limite exato ainda vale');
  assert.equal(isReopenWindowOpen(finalizado, new Date('2026-09-08T10:00:01Z')), false, 'um segundo depois do limite não vale mais');
  assert.equal(isReopenWindowOpen(finalizado, new Date('2026-09-03T00:00:00Z')), true);
  assert.equal(isReopenWindowOpen(null, new Date()), true, 'sem data de conclusão não bloqueia (comportamento anterior)');
});

function controller(handler) {
  const calls = [];
  const query = async (sql, values) => { calls.push({ sql, values }); return handler(sql, values); };
  const database = require.resolve('../src/config/database');
  require.cache[database] = { id: database, filename: database, loaded: true, exports: { query, connect: async () => ({ query, release() {} }) } };
  const file = require.resolve('../src/controllers/chamadoController');
  delete require.cache[file];
  return { c: require(file), calls };
}
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
const req = (user, body = {}) => ({ params: { id: '10' }, body, user, headers: {}, protocol: 'http', get: () => 'localhost' });

function handlerFor(ticket) {
  return (sql) => {
    if (/FROM chamados c\s+LEFT JOIN usuarios sol/.test(sql)) return { rows: [ticket] };
    if (/^\s*UPDATE chamados SET status = 'REOPENED'/.test(sql)) return { rows: [{ ...ticket, status: 'REOPENED' }] };
    return { rows: [] };
  };
}

test('dentro de 7 dias: solicitante e técnico responsável reabrem o chamado concluído', async () => {
  const finalizado_em = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };

  let { c, calls } = controller(handlerFor(ticket));
  let res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou a falhar' }), res);
  assert.equal(res.body.status, 'REOPENED', JSON.stringify(res.body));
  assert.equal(calls.some((x) => x.sql.startsWith("UPDATE chamados SET status = 'REOPENED'")), true);

  ({ c, calls } = controller(handlerFor(ticket)));
  res = response();
  await c.reabrirChamado(req({ id: 20, perfil: 'tecnico', email: 't@x.test' }, { motivo: 'Cliente pediu' }), res);
  assert.equal(res.body.status, 'REOPENED');
});

test('depois de 7 dias: solicitante e técnico são bloqueados com mensagem clara', async () => {
  const finalizado_em = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };

  for (const user of [{ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { id: 20, perfil: 'tecnico', email: 't@x.test' }]) {
    const { c, calls } = controller(handlerFor(ticket));
    const res = response();
    await c.reabrirChamado(req(user, { motivo: 'Voltou a falhar' }), res);
    assert.equal(res.code, 400);
    assert.match(res.body.erro, /7 dias/);
    assert.equal(calls.some((x) => x.sql.startsWith("UPDATE chamados SET status = 'REOPENED'")), false, 'não deve gravar a reabertura');
  }
});

test('admin reabre mesmo depois de 7 dias, sem mudar o acesso que ele já tinha', async () => {
  const finalizado_em = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };
  const { c } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 1, perfil: 'admin', email: 'a@x.test' }, { motivo: 'Auditoria' }), res);
  assert.equal(res.body.status, 'REOPENED');
});

test('chamado sem finalizado_em registrado não é bloqueado pelo prazo (compatibilidade)', async () => {
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: null };
  const { c } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou' }), res);
  assert.equal(res.body.status, 'REOPENED');
});

test('o prazo é checado antes do motivo, mas continua exigindo motivo dentro do prazo', async () => {
  const finalizado_em = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };
  let { c } = controller(handlerFor(ticket));
  let res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: '' }), res);
  assert.match(res.body.erro, /7 dias/, 'prazo vencido prevalece sobre a falta de motivo');

  const dentroDoPrazo = { ...ticket, finalizado_em: new Date().toISOString() };
  ({ c } = controller(handlerFor(dentroDoPrazo)));
  res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: '' }), res);
  assert.equal(res.body.erro, 'O motivo da reabertura é obrigatório');
});

test('usuário sem relação com o chamado continua sem poder reabrir (permissão não muda)', async () => {
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: new Date().toISOString() };
  const { c } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 99, perfil: 'usuario', email: 'outro@x.test' }, { motivo: 'x' }), res);
  assert.equal(res.code, 403);
});
