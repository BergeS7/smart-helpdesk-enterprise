const test = require('node:test');
const assert = require('node:assert/strict');

function controller(handler) {
  const calls = [];
  const query = async (sql, values) => { calls.push({ sql, values }); return handler(sql, values); };
  const database = require.resolve('../src/config/database');
  require.cache[database] = { id: database, filename: database, loaded: true, exports: { query, connect: async () => ({ query, release() {} }) } };
  const file = require.resolve('../src/controllers/assetController');
  delete require.cache[file];
  return { c: require(file), calls };
}
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
const assetRow = (extra = {}) => ({ id: 5, device_id: 'D5', hostname: 'PC-5', status: 'online', ultimo_heartbeat: new Date().toISOString(), usuario: 'DOM\joao', ...extra });

test('vincula um usuário ativo ao ativo e devolve o vínculo', async () => {
  const { c, calls } = controller((sql) => {
    if (sql.startsWith('SELECT 1 FROM usuarios')) return { rows: [{}] };
    if (sql.startsWith('UPDATE ativos SET usuario_id')) return { rows: [{ id: 5 }] };
    if (sql.includes('LEFT JOIN usuarios')) return { rows: [assetRow({ usuario_id: 9, vinculo_nome: 'João', vinculo_email: 'joao@x.test' })] };
    return { rows: [] };
  });
  const res = response();
  await c.setUser({ params: { id: '5' }, body: { usuario_id: 9 } }, res);
  assert.equal(res.body.usuarioVinculado.id, 9);
  assert.equal(res.body.usuarioVinculado.nome, 'João');
  assert.equal(res.body.usuario, 'DOM\joao', 'o usuário detectado pelo agente não é alterado');
  assert.deepEqual(calls.find(x => x.sql.startsWith('UPDATE ativos SET usuario_id')).values, [9, 5]);
});

test('vínculo é opcional: null desvincula sem consultar usuários', async () => {
  const { c, calls } = controller((sql) => {
    if (sql.startsWith('UPDATE ativos SET usuario_id')) return { rows: [{ id: 5 }] };
    return { rows: [assetRow({ usuario_id: null })] };
  });
  const res = response();
  await c.setUser({ params: { id: '5' }, body: { usuario_id: null } }, res);
  assert.equal(res.body.usuarioVinculado, null);
  assert.equal(calls.some(x => x.sql.startsWith('SELECT 1 FROM usuarios')), false);
  assert.deepEqual(calls.find(x => x.sql.startsWith('UPDATE ativos SET usuario_id')).values, [null, 5]);
});

test('rejeita usuário inexistente/inativo, id inválido e ativo inexistente', async () => {
  let { c } = controller(() => ({ rows: [] }));
  let res = response();
  await c.setUser({ params: { id: '5' }, body: { usuario_id: 99 } }, res);
  assert.equal(res.code, 404);
  res = response();
  await c.setUser({ params: { id: '5' }, body: { usuario_id: 'abc' } }, res);
  assert.equal(res.code, 400);
  res = response();
  await c.setUser({ params: { id: 'x' }, body: { usuario_id: null } }, res);
  assert.equal(res.code, 404);
  res = response();
  await c.setUser({ params: { id: '5' }, body: { usuario_id: null } }, res);
  assert.equal(res.code, 404);
});

test('meus ativos filtra pelo usuário autenticado e não expõe dados técnicos', async () => {
  const { c, calls } = controller(() => ({ rows: [{ ...assetRow(), ip: '10.0.0.1', mac: 'AA', fabricante: 'Dell', modelo: 'Optiplex', unidade: 'UBS', municipio: 'Cidade' }] }));
  const res = response();
  await c.myAssets({ user: { id: 7 } }, res);
  assert.deepEqual(calls[0].values, [7]);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].hostname, 'PC-5');
  for (const key of ['ip', 'mac', 'deviceId', 'token', 'usuario']) assert.equal(key in res.body[0], false, key);
});

test('busca de usuários escapa curingas do LIKE e limita o resultado', async () => {
  const { c, calls } = controller(() => ({ rows: [] }));
  await c.assignableUsers({ query: { q: '50%_a' } }, response());
  assert.equal(calls[0].values[1], '%50\\%\\_a%');
  assert.match(calls[0].sql, /LIMIT 20/);
});

test('lista e detalhe trazem nome e foto do responsável vinculado', async () => {
  const photo = require.resolve('../src/utils/profilePhoto');
  const original = require.cache[photo];
  require.cache[photo] = { id: photo, filename: photo, loaded: true, exports: { montarUrlFotoPerfil: async (_req, id, path) => `https://fotos.test/${id}/${path}` } };
  try {
    const linked = assetRow({ usuario_id: 9, vinculo_nome: 'João', vinculo_email: 'joao@x.test', vinculo_foto: 'usuarios/9/a.jpg' });
    const { c } = controller((sql) => ({ rows: sql.includes('LEFT JOIN usuarios') ? [linked, assetRow({ id: 6 })] : [] }));
    const res = response();
    await c.list({}, res);
    assert.equal(res.body[0].usuarioVinculado.fotoUrl, 'https://fotos.test/9/usuarios/9/a.jpg');
    assert.equal(res.body[1].usuarioVinculado, null, 'ativo sem vínculo não expõe usuário');
    const detail = response();
    await c.detail({ params: { id: '5' } }, detail);
    assert.equal(detail.body.usuarioVinculado.nome, 'João');
  } finally {
    if (original) require.cache[photo] = original; else delete require.cache[photo];
  }
});
