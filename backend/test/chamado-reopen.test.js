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
    if (/^\s*UPDATE chamados SET status = 'IN_PROGRESS'/.test(sql)) return { rows: [{ ...ticket, status: 'IN_PROGRESS' }] };
    return { rows: [] };
  };
}

test('dentro de 7 dias: solicitante e técnico responsável reabrem e o chamado já volta "Em andamento"', async () => {
  const finalizado_em = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };

  let { c, calls } = controller(handlerFor(ticket));
  let res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou a falhar' }), res);
  assert.equal(res.body.status, 'IN_PROGRESS', JSON.stringify(res.body));
  assert.equal(calls.some((x) => x.sql.startsWith("UPDATE chamados SET status = 'IN_PROGRESS'")), true);
  // notifica quem já era responsável, para o chamado não passar despercebido na fila dele
  const notificacao = calls.find((x) => x.sql.startsWith('INSERT INTO notificacoes'));
  assert.deepEqual(notificacao.values.slice(0, 2), [20, 'Chamado reaberto']);

  ({ c, calls } = controller(handlerFor(ticket)));
  res = response();
  await c.reabrirChamado(req({ id: 20, perfil: 'tecnico', email: 't@x.test' }, { motivo: 'Cliente pediu' }), res);
  assert.equal(res.body.status, 'IN_PROGRESS');
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
    assert.equal(calls.some((x) => x.sql.startsWith("UPDATE chamados SET status = 'IN_PROGRESS'")), false, 'não deve gravar a reabertura');
  }
});

test('admin reabre mesmo depois de 7 dias, sem mudar o acesso que ele já tinha', async () => {
  const finalizado_em = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };
  const { c } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 1, perfil: 'admin', email: 'a@x.test' }, { motivo: 'Auditoria' }), res);
  assert.equal(res.body.status, 'IN_PROGRESS');
});

test('chamado sem finalizado_em e sem atualizado_em não é bloqueado pelo prazo (compatibilidade)', async () => {
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: null, atualizado_em: null };
  const { c } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou' }), res);
  assert.equal(res.body.status, 'IN_PROGRESS');
});

test('chamado antigo sem finalizado_em mas com atualizado_em de mais de 7 dias é bloqueado (bug corrigido)', async () => {
  const atualizado_em = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: null, atualizado_em };
  const { c, calls } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou' }), res);
  assert.equal(res.code, 400);
  assert.match(res.body.erro, /7 dias/);
  assert.equal(calls.some((x) => x.sql.startsWith("UPDATE chamados SET status = 'IN_PROGRESS'")), false);
});

test('chamado antigo sem finalizado_em mas com atualizado_em recente ainda pode ser reaberto', async () => {
  const atualizado_em = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: null, atualizado_em };
  const { c } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou' }), res);
  assert.equal(res.body.status, 'IN_PROGRESS');
});

test('reabertura sem responsável definido não tenta notificar ninguém (nem quebra)', async () => {
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: null, finalizado_em: new Date().toISOString() };
  const { c, calls } = controller(handlerFor(ticket));
  const res = response();
  await c.reabrirChamado(req({ id: 5, perfil: 'usuario', email: 'ana@x.test' }, { motivo: 'Voltou' }), res);
  assert.equal(res.body.status, 'IN_PROGRESS');
  assert.equal(calls.some((x) => x.sql.startsWith('INSERT INTO notificacoes')), false);
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

// O editor de status genérico (usado pelo dropdown "Ações do suporte") também permite CLOSED->REOPENED
// (única transição de TRANSITIONS para fora de um status concluído) e é uma segunda porta para reabrir,
// além do botão dedicado. Sem essa checagem em atualizarChamado, ela bypassava o prazo de 7 dias por
// completo: sem motivo, sem data de referência, sem limite.
function handlerForUpdate(ticket) {
  return (sql) => {
    if (/FROM chamados c\s+LEFT JOIN usuarios sol/.test(sql)) return { rows: [ticket] };
    // Consultada mesmo sem trocar de responsável, pois responsavelIdFinal cai para o responsável atual.
    if (/SELECT nome, email FROM usuarios WHERE id = \$1/.test(sql)) return { rows: [{ nome: 'Técnico', email: 't@x.test' }] };
    if (/^\s*UPDATE chamados SET/.test(sql)) return { rows: [{ ...ticket, status: 'REOPENED', finalizado_em: null }] };
    return { rows: [] };
  };
}

test('editor de status genérico bloqueia CLOSED->REOPENED depois de 7 dias (mesma regra do botão Reabrir)', async () => {
  const finalizado_em = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em };
  const { c, calls } = controller(handlerForUpdate(ticket));
  const res = response();
  await c.atualizarChamado(req({ id: 20, perfil: 'tecnico', email: 't@x.test' }, { status: 'REOPENED' }), res);
  assert.equal(res.code, 400);
  assert.match(res.body.erro, /7 dias/);
  assert.equal(calls.some((x) => x.sql.startsWith('UPDATE chamados SET')), false, 'não deve gravar a reabertura');
});

test('editor de status genérico permite reabrir dentro de 7 dias e admin sem limite', async () => {
  const dentro = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() };
  let { c } = controller(handlerForUpdate(dentro));
  let res = response();
  await c.atualizarChamado(req({ id: 20, perfil: 'tecnico', email: 't@x.test' }, { status: 'REOPENED' }), res);
  assert.equal(res.body.status, 'REOPENED', JSON.stringify(res.body));

  const antigo = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString() };
  ({ c } = controller(handlerForUpdate(antigo)));
  res = response();
  await c.atualizarChamado(req({ id: 1, perfil: 'admin', email: 'a@x.test' }, { status: 'REOPENED' }), res);
  assert.equal(res.body.status, 'REOPENED');
});

test('editor de status genérico usa atualizado_em quando falta finalizado_em, igual ao botão Reabrir', async () => {
  const ticket = { id: 10, status: 'CLOSED', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: null, atualizado_em: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() };
  const { c, calls } = controller(handlerForUpdate(ticket));
  const res = response();
  await c.atualizarChamado(req({ id: 20, perfil: 'tecnico', email: 't@x.test' }, { status: 'REOPENED' }), res);
  assert.equal(res.code, 400);
  assert.match(res.body.erro, /7 dias/);
  assert.equal(calls.some((x) => x.sql.startsWith('UPDATE chamados SET')), false);
});

test('outras transições de status não são afetadas pela checagem de prazo', async () => {
  const ticket = { id: 10, status: 'IN_PROGRESS', usuario_id: 5, email_solicitante: 'ana@x.test', responsavel_id: 20, finalizado_em: null };
  const { c, calls } = controller(handlerForUpdate(ticket));
  const res = response();
  await c.atualizarChamado(req({ id: 20, perfil: 'tecnico', email: 't@x.test' }, { status: 'WAITING_USER' }), res);
  assert.equal(res.body.erro, undefined, JSON.stringify(res.body));
  assert.equal(calls.some((x) => x.sql.startsWith('UPDATE chamados SET')), true, 'a atualização deve prosseguir normalmente');
});
