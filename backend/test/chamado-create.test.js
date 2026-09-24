const test = require('node:test');
const assert = require('node:assert/strict');

// Carrega o controller com banco, fila e e-mail falsos para observar o que criarChamado dispara.
function controller() {
  const calls = { fila: [], emails: [] };
  const ticket = { id: 99, numero_chamado: '#HD-2026-0099', titulo: 'Impressora parada', usuario_id: 5, responsavel_id: null, status: 'OPEN', prioridade: 'Media' };
  const query = async (sql) => {
    if (/FROM usuarios\s+WHERE id = \$1/.test(sql)) return { rows: [{ id: 5, nome: 'Ana', email: 'ana@x.test', perfil: 'usuario', status: 'ativo', departamento: 'Financeiro' }] };
    if (/nextval/.test(sql)) return { rows: [{ proximo: 99 }] };
    if (/^\s*(INSERT INTO chamados|UPDATE chamados)[\s\S]*RETURNING \*/.test(sql)) return { rows: [ticket] };
    return { rows: [] };
  };
  const stub = (path, exports) => {
    const file = require.resolve(path);
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
  };
  stub('../src/config/database', { query, connect: async () => ({ query, release() {} }) });
  stub('../src/services/queueNotificationService', { notificarNovoChamadoNaFila: async (chamado) => { calls.fila.push(chamado); } });
  stub('../src/services/emailService', { enviarEmail: async (email) => { calls.emails.push(email); } });
  for (const key of Object.keys(require.cache)) if (/controllers[\/]chamado/.test(key)) delete require.cache[key];
  return { c: require('../src/controllers/chamadoController'), calls };
}
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }

test('chamado sem responsável avisa a fila da equipe e confirma por e-mail ao solicitante', async () => {
  const { c, calls } = controller();
  const res = response();
  const req = { params: {}, body: { titulo: 'Impressora parada', descricao: 'A impressora do setor não imprime', tipo_chamado: 'Incidente' }, user: { id: 5, perfil: 'usuario', email: 'ana@x.test' }, headers: {}, protocol: 'http', get: () => 'localhost' };
  await c.criarChamado(req, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.aviso, undefined, 'não deve cair no catch de etapa complementar');
  assert.deepEqual(calls.fila.map((chamado) => chamado.id), [99]);
  assert.deepEqual(calls.emails.map((email) => email.para), ['ana@x.test']);
});
