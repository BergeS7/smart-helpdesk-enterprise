const test = require('node:test');
const assert = require('node:assert/strict');

const ANA = { id: 5, nome: 'Ana', email: 'ana@x.test', perfil: 'usuario', status: 'ativo', departamento: 'Financeiro' };
const TECNICO = { id: 7, nome: 'Tiago', email: 'tiago@x.test', perfil: 'tecnico', status: 'ativo', departamento: 'TI' };
const BRUNO_INATIVO = { id: 9, nome: 'Bruno', email: 'bruno@x.test', perfil: 'usuario', status: 'inativo', departamento: 'Vendas' };

// Carrega o controller com banco, fila e e-mail falsos para observar o que criarChamado dispara.
// `logado` é quem faz a requisição; `outros` são os usuários da mesma empresa que podem ser solicitantes.
function controller({ logado = ANA, outros = [], donoDoAtivo = null } = {}) {
  const calls = { fila: [], emails: [], insert: null, setores: [], notificacoes: [], movimentacoes: [] };
  const ticket = { id: 99, numero_chamado: '#HD-2026-0099', titulo: 'Impressora parada', usuario_id: logado.id, responsavel_id: null, status: 'OPEN', prioridade: 'Media' };
  const query = async (sql, params = []) => {
    if (/FROM usuarios\s+WHERE id = \$1/.test(sql)) return { rows: [logado] };
    if (/FROM usuarios u\s+WHERE u\.id = \$1/.test(sql)) return { rows: outros.filter((u) => u.id === params[0]) };
    if (/FROM ativos a\s+JOIN usuarios/.test(sql)) return { rows: donoDoAtivo ? [{ id: donoDoAtivo.id }] : [] };
    if (/FROM ativos WHERE id=\$1/.test(sql)) return { rows: [{ id: params[0], hostname: 'PC-01', patrimonio: 'PAT-1' }] };
    if (/FROM teams/.test(sql)) { calls.setores.push(params[0]); return { rows: [] }; }
    if (/INSERT INTO notificacoes/.test(sql)) { calls.notificacoes.push({ usuario: params[0], titulo: params[1] }); return { rows: [] }; }
    if (/INSERT INTO chamado_movimentacoes/.test(sql)) { calls.movimentacoes.push(params[5]); return { rows: [] }; }
    if (/nextval/.test(sql)) return { rows: [{ proximo: 99 }] };
    if (/^\s*INSERT INTO chamados/.test(sql)) {
      calls.insert = params;
      Object.assign(ticket, { usuario_id: params[8], solicitante: params[9], setor: params[11], aberto_por_id: params[30], canal_abertura: params[32] });
      return { rows: [ticket] };
    }
    if (/^\s*UPDATE chamados[\s\S]*RETURNING \*/.test(sql)) return { rows: [ticket] };
    return { rows: [] };
  };
  const stub = (path, exports) => {
    const file = require.resolve(path);
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
  };
  stub('../src/config/database', { query, connect: async () => ({ query, release() {} }) });
  stub('../src/services/queueNotificationService', { notificarNovoChamadoNaFila: async (chamado) => { calls.fila.push(chamado); } });
  stub('../src/services/emailService', { enviarEmail: async (email) => { calls.emails.push(email); } });
  for (const key of Object.keys(require.cache)) if (/controllers[\/\\]chamado|ticketNotificationService|ticketRatingEmailService/.test(key)) delete require.cache[key];
  return { c: require('../src/controllers/chamadoController'), calls };
}
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function request(user, body = {}) {
  return { params: {}, body: { titulo: 'Impressora parada', descricao: 'A impressora do setor não imprime', tipo_chamado: 'Incidente', ...body }, user: { id: user.id, perfil: user.perfil, email: user.email, nome: user.nome }, headers: {}, protocol: 'http', get: () => 'localhost' };
}

test('chamado sem responsável avisa a fila da equipe e confirma por e-mail ao solicitante', async () => {
  const { c, calls } = controller();
  const res = response();
  await c.criarChamado(request(ANA), res);
  assert.equal(res.code, 201);
  assert.equal(res.body.aviso, undefined, 'não deve cair no catch de etapa complementar');
  assert.deepEqual(calls.fila.map((chamado) => chamado.id), [99]);
  assert.deepEqual(calls.emails.map((email) => email.para), ['ana@x.test']);
  assert.equal(calls.insert[30], null, 'aberto pelo próprio solicitante não registra aberto_por');
  assert.equal(calls.insert[32], 'portal');
});

test('técnico abre em nome do usuário: solicitante, setor, e-mail e aviso ficam com o usuário', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [ANA] });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 5, canal_abertura: 'telefone' }), res);
  assert.equal(res.code, 201);
  assert.equal(res.body.aviso, undefined);
  assert.equal(calls.insert[8], 5, 'usuario_id é o solicitante');
  assert.equal(calls.insert[9], 'Ana');
  assert.equal(calls.insert[11], 'Financeiro', 'setor vem do solicitante, não do técnico');
  assert.equal(calls.insert[30], 7, 'aberto_por_id guarda o técnico');
  assert.equal(calls.insert[31], 'Tiago');
  assert.equal(calls.insert[32], 'telefone');
  assert.deepEqual(calls.setores, ['Financeiro'], 'roteamento por equipe usa o setor do solicitante');
  assert.deepEqual(calls.emails.map((email) => email.para), ['ana@x.test']);
  assert.ok(calls.notificacoes.some((n) => n.usuario === 5 && n.titulo === 'Chamado aberto em seu nome'));
  assert.ok(calls.movimentacoes.some((m) => /aberto por Tiago em nome de Ana \(canal: telefone\)/.test(m)));
});

test('usuário comum não abre chamado em nome de outra pessoa', async () => {
  const { c, calls } = controller({ logado: ANA, outros: [TECNICO] });
  const res = response();
  await c.criarChamado(request(ANA, { solicitante_id: 7 }), res);
  assert.equal(res.code, 403);
  assert.equal(calls.insert, null);
});

test('usuário comum informando o próprio id segue normalmente', async () => {
  const { c, calls } = controller();
  const res = response();
  await c.criarChamado(request(ANA, { solicitante_id: 5 }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[8], 5);
  assert.equal(calls.insert[30], null);
});

test('solicitante de outra empresa ou inexistente é recusado', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [] });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 42 }), res);
  assert.equal(res.code, 404);
  assert.equal(calls.insert, null);
});

test('solicitante inativo é recusado', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [BRUNO_INATIVO] });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 9 }), res);
  assert.equal(res.code, 400);
  assert.equal(calls.insert, null);
});

test('canal desconhecido em nome de outro vira "outro"', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [ANA] });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 5, canal_abertura: 'pombo-correio' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[32], 'outro');
});

test('pelo patrimônio, o dono do equipamento vira o solicitante', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [ANA], donoDoAtivo: ANA });
  const res = response();
  await c.criarChamado(request(TECNICO, { ativo_id: 3, solicitante_do_ativo: true, canal_abertura: 'monitoramento' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[8], 5);
  assert.equal(calls.insert[30], 7);
  assert.equal(calls.insert[32], 'monitoramento');
});

test('pelo patrimônio sem dono identificado, o técnico continua como solicitante', async () => {
  const { c, calls } = controller({ logado: TECNICO, donoDoAtivo: null });
  const res = response();
  await c.criarChamado(request(TECNICO, { ativo_id: 3, solicitante_do_ativo: true, canal_abertura: 'monitoramento' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[8], 7);
  assert.equal(calls.insert[30], null);
  assert.equal(calls.insert[32], 'monitoramento');
});
