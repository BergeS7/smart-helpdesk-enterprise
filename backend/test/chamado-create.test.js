const test = require('node:test');
const assert = require('node:assert/strict');

const ANA = { id: 5, nome: 'Ana', email: 'ana@x.test', perfil: 'usuario', status: 'ativo', departamento: 'Financeiro' };
const TECNICO = { id: 7, nome: 'Tiago', email: 'tiago@x.test', perfil: 'tecnico', status: 'ativo', departamento: 'TI' };
const BRUNO_INATIVO = { id: 9, nome: 'Bruno', email: 'bruno@x.test', perfil: 'usuario', status: 'inativo', departamento: 'Vendas' };
const COMPARTILHADA = { id: 50, nome: 'Equipamentos compartilhados', email: 'equipamentos.compartilhados.e1@sistema.invalid', perfil: 'usuario', status: 'ativo', departamento: 'Equipamentos compartilhados' };

// Carrega o controller com banco, fila e e-mail falsos para observar o que criarChamado dispara.
// `logado` é quem faz a requisição; `outros` são os usuários da mesma empresa que podem ser solicitantes.
// `emAberto` e `pendente` simulam o que as regras de abertura encontram no banco;
// `contaExistente` diz se a conta "Equipamentos compartilhados" da empresa já foi criada.
function controller({ logado = ANA, outros = [], donoDoAtivo = null, equipe = null, emAberto = null, pendente = null, contaExistente = true, semMigracao = false } = {}) {
  const calls = { fila: [], emails: [], insert: null, setores: [], notificacoes: [], movimentacoes: [], roteamento: null, regras: 0, contaCriada: null };
  const ticket = { id: 99, numero_chamado: '#HD-2026-0099', titulo: 'Impressora parada', usuario_id: logado.id, responsavel_id: null, status: 'OPEN', prioridade: 'Media' };
  const query = async (sql, params = []) => {
    // Regras de abertura (aberturaChamadoService).
    if (/FROM chamados c[\s\S]*NOT IN \('RESOLVED', 'CLOSED', 'CANCELED'\)/.test(sql)) { calls.regras += 1; return { rows: emAberto ? [emAberto] : [] }; }
    if (/FROM configuracoes_sistema/.test(sql)) return { rows: [{ valor: '2026-11-01T00:00:00' }] };
    if (/performance_ratings pr/.test(sql)) return { rows: pendente ? [pendente] : [] };
    // Conta "Equipamentos compartilhados" (contaCompartilhadaService).
    if (/SELECT empresa_id FROM usuarios WHERE id = \$1/.test(sql)) return { rows: [{ empresa_id: 1 }] };
    if (semMigracao && /conta_compartilhada/.test(sql)) throw Object.assign(new Error('column "conta_compartilhada" does not exist'), { code: '42703' });
    if (/WHERE conta_compartilhada = TRUE/.test(sql)) return { rows: contaExistente || calls.contaCriada ? [COMPARTILHADA] : [] };
    if (/INSERT INTO usuarios/.test(sql)) { calls.contaCriada = params; return { rows: [COMPARTILHADA] }; }
    if (/FROM usuarios\s+WHERE id = \$1/.test(sql)) return { rows: [logado] };
    if (/FROM usuarios u\s+WHERE u\.id = \$1/.test(sql)) return { rows: outros.filter((u) => u.id === params[0]) };
    if (/FROM ativos a\s+JOIN usuarios/.test(sql)) return { rows: donoDoAtivo ? [{ id: donoDoAtivo.id }] : [] };
    if (/FROM ativos WHERE id=\$1/.test(sql)) return { rows: [{ id: params[0], hostname: 'PC-01', patrimonio: 'PAT-1' }] };
    if (/FROM teams/.test(sql)) { calls.setores.push(params[0]); return { rows: equipe ? [equipe] : [] }; }
    if (/UPDATE chamados SET team_id/.test(sql)) {
      calls.roteamento = params;
      Object.assign(ticket, { team_id: params[0], responsavel_id: params[1], responsavel: params[2] });
      return { rows: [ticket] };
    }
    if (/INSERT INTO notificacoes/.test(sql)) { calls.notificacoes.push({ usuario: params[0], titulo: params[1] }); return { rows: [] }; }
    if (/INSERT INTO chamado_movimentacoes/.test(sql)) { calls.movimentacoes.push(params[5]); return { rows: [] }; }
    if (/nextval/.test(sql)) return { rows: [{ proximo: 99 }] };
    if (/^\s*INSERT INTO chamados/.test(sql)) {
      calls.insert = params;
      Object.assign(ticket, { usuario_id: params[8], solicitante: params[9], setor: params[11], responsavel_id: params[16], responsavel: params[17], aberto_por_id: params[30], canal_abertura: params[32] });
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
  for (const key of Object.keys(require.cache)) if (/controllers[\/\\]chamado|ticketNotificationService|ticketRatingEmailService|aberturaChamadoService|contaCompartilhadaService/.test(key)) delete require.cache[key];
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
  assert.equal(calls.insert[16], 7, 'o chamado já nasce delegado ao técnico que o abriu');
  assert.equal(calls.insert[17], 'Tiago');
  assert.deepEqual(calls.fila, [], 'delegado não vai para a fila da equipe');
  assert.ok(calls.notificacoes.some((n) => n.usuario === 5 && n.titulo === 'Chamado aberto em seu nome'));
  assert.ok(!calls.notificacoes.some((n) => n.usuario === 7), 'quem abriu não recebe aviso do próprio chamado');
  assert.ok(calls.movimentacoes.some((m) => /delegado a Tiago/.test(m)));
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

test('pelo patrimônio sem dono identificado, o solicitante é a conta "Equipamentos compartilhados"', async () => {
  const { c, calls } = controller({ logado: TECNICO, donoDoAtivo: null });
  const res = response();
  await c.criarChamado(request(TECNICO, { ativo_id: 3, solicitante_do_ativo: true, canal_abertura: 'monitoramento' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[8], 50, 'usuario_id é a conta compartilhada, não o técnico');
  assert.equal(calls.insert[9], 'Equipamentos compartilhados');
  assert.equal(calls.insert[30], 7, 'aberto_por_id guarda o técnico');
  assert.equal(calls.insert[16], 7, 'fica delegado ao técnico, como todo chamado aberto em nome de alguém');
  assert.equal(calls.insert[32], 'monitoramento');
});

// --- Conta "Equipamentos compartilhados" ---------------------------------------------------------

test('técnico abre chamado para equipamento compartilhado (PC da oficina)', async () => {
  const { c, calls } = controller({ logado: TECNICO });
  const res = response();
  await c.criarChamado(request(TECNICO, { equipamento_compartilhado: true, canal_abertura: 'presencial' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[8], 50);
  assert.equal(calls.insert[11], 'Equipamentos compartilhados', 'setor vem da conta compartilhada');
  assert.equal(calls.insert[30], 7);
  assert.equal(calls.insert[16], 7);
  assert.deepEqual(calls.fila, [], 'delegado ao técnico não vai para a fila');
  assert.ok(!calls.notificacoes.some((n) => n.usuario === 50), 'ninguém lê notificação da conta compartilhada');
  assert.equal(calls.regras, 0, 'a equipe não passa pelas regras de abertura do portal');
});

test('a conta compartilhada é criada na primeira vez que a empresa precisa dela', async () => {
  const { c, calls } = controller({ logado: TECNICO, contaExistente: false });
  const res = response();
  await c.criarChamado(request(TECNICO, { equipamento_compartilhado: true }), res);
  assert.equal(res.code, 201);
  assert.ok(calls.contaCriada, 'INSERT da conta foi executado');
  assert.equal(calls.contaCriada[0], 'Equipamentos compartilhados');
  assert.match(calls.contaCriada[1], /@sistema\.invalid$/, 'e-mail sem caixa postal real');
  assert.match(calls.contaCriada[2], /^\$2[aby]\$/, 'senha guardada só como hash bcrypt');
  assert.equal(calls.contaCriada[3], 1, 'conta da empresa de quem abriu');
  assert.equal(calls.insert[8], 50);
});

test('usuário comum não abre chamado para equipamento compartilhado', async () => {
  const { c, calls } = controller({ logado: ANA });
  const res = response();
  await c.criarChamado(request(ANA, { equipamento_compartilhado: true }), res);
  assert.equal(res.code, 403);
  assert.equal(calls.insert, null);
});

// --- Regras de abertura pelo portal ---------------------------------------------------------------

test('usuário com chamado em andamento não abre outro e recebe a mensagem do motivo', async () => {
  const { c, calls } = controller({ emAberto: { id: 12, numero_chamado: '#HD-2026-0012', status: 'IN_PROGRESS' } });
  const res = response();
  await c.criarChamado(request(ANA), res);
  assert.equal(res.code, 409);
  assert.equal(res.body.codigo, 'CHAMADO_EM_ABERTO');
  assert.equal(res.body.chamado_id, 12);
  assert.match(res.body.erro, /#HD-2026-0012 em andamento \(Em andamento\)/);
  assert.match(res.body.erro, /um chamado aberto por vez/);
  assert.equal(calls.insert, null, 'nada é gravado');
  assert.deepEqual(calls.emails, []);
});

test('usuário com chamado concluído sem avaliação precisa avaliar antes de abrir outro', async () => {
  const { c, calls } = controller({ pendente: { id: 8, numero_chamado: '#HD-2026-0008', status: 'CLOSED' } });
  const res = response();
  await c.criarChamado(request(ANA), res);
  assert.equal(res.code, 409);
  assert.equal(res.body.codigo, 'AVALIACAO_PENDENTE');
  assert.equal(res.body.chamado_id, 8);
  assert.match(res.body.erro, /Avalie o atendimento do chamado #HD-2026-0008/);
  assert.equal(calls.insert, null);
});

test('técnico abre em nome do usuário mesmo que ele tenha chamado em andamento', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [ANA], emAberto: { id: 12, numero_chamado: '#HD-2026-0012', status: 'OPEN' } });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 5, canal_abertura: 'telefone' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.regras, 0);
});

test('técnico abrindo chamado para si não passa pelas regras do portal', async () => {
  const { c, calls } = controller({ logado: TECNICO, emAberto: { id: 12, numero_chamado: '#HD-2026-0012', status: 'OPEN' } });
  const res = response();
  await c.criarChamado(request(TECNICO), res);
  assert.equal(res.code, 201);
  assert.equal(calls.regras, 0);
});

test('consulta de abertura do portal informa o bloqueio antes do formulário', async () => {
  const { c } = controller({ pendente: { id: 8, numero_chamado: '#HD-2026-0008', status: 'RESOLVED' } });
  const res = response();
  await c.verificarAberturaDoUsuario(request(ANA), res);
  assert.equal(res.code, undefined, 'responde 200');
  assert.equal(res.body.pode_abrir, false);
  assert.equal(res.body.codigo, 'AVALIACAO_PENDENTE');

  const livre = controller();
  const resLivre = response();
  await livre.c.verificarAberturaDoUsuario(request(ANA), resLivre);
  assert.deepEqual(resLivre.body, { pode_abrir: true });
});

test('em nome do usuário, a equipe do setor é registrada mas a distribuição automática não troca o responsável', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [ANA], equipe: { id: 3, distribution_mode: 'round_robin' } });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 5, canal_abertura: 'telefone' }), res);
  assert.equal(res.code, 201);
  assert.deepEqual(calls.roteamento.slice(0, 3), [3, 7, 'Tiago']);
});

test('aberto pelo próprio usuário vai para a fila mesmo com equipe em distribuição automática', async () => {
  const { c, calls } = controller({ equipe: { id: 3, distribution_mode: 'round_robin' } });
  const res = response();
  await c.criarChamado(request(ANA), res);
  assert.equal(res.code, 201);
  assert.deepEqual(calls.roteamento.slice(0, 3), [3, null, null]);
  assert.deepEqual(calls.fila.map((chamado) => chamado.id), [99]);
  assert.equal(calls.insert[16], null, 'não escolhe técnico na abertura');
  assert.ok(!calls.notificacoes.some((n) => /atribuído a você|assumido/i.test(n.titulo)));
});

test('aberto em nome do usuário não entra na fila', async () => {
  const { c, calls } = controller({ logado: TECNICO, outros: [ANA] });
  const res = response();
  await c.criarChamado(request(TECNICO, { solicitante_id: 5, canal_abertura: 'telefone' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[16], 7);
  assert.deepEqual(calls.fila, []);
});

test('durante a implantação (migration pendente), o patrimônio sem dono mantém o técnico como solicitante', async () => {
  const { c, calls } = controller({ logado: TECNICO, donoDoAtivo: null, semMigracao: true });
  const res = response();
  await c.criarChamado(request(TECNICO, { ativo_id: 3, solicitante_do_ativo: true, canal_abertura: 'monitoramento' }), res);
  assert.equal(res.code, 201);
  assert.equal(calls.insert[8], 7, 'comportamento anterior: o técnico é o solicitante');
  assert.equal(calls.insert[30], null);
});

test('durante a implantação, a opção de equipamentos compartilhados avisa para tentar depois', async () => {
  const { c, calls } = controller({ logado: TECNICO, semMigracao: true });
  const res = response();
  await c.criarChamado(request(TECNICO, { equipamento_compartilhado: true }), res);
  assert.equal(res.code, 503);
  assert.match(res.body.erro, /sendo ativada/);
  assert.equal(calls.insert, null);
});
