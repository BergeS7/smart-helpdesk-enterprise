const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { compareVersions, parseRelease, signedMessage } = require('../src/domain/agentRelease');

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072 });
function releaseFile(version = '2.2.0', packageBytes = Buffer.from('PK\u0003\u0004conteudo-do-zip')) {
  const sha256 = crypto.createHash('sha256').update(packageBytes).digest('hex');
  const signature = crypto.sign('sha256', Buffer.from(signedMessage(version, sha256)), privateKey).toString('base64');
  return { format: 'smarthelpdesk-agent-update', version, sha256, signature, package: packageBytes.toString('base64') };
}

test('compara versões numericamente, não como texto', () => {
  assert.equal(compareVersions('2.10.0', '2.9.0'), 1);
  assert.equal(compareVersions('2.2.0', '2.2.0'), 0);
  assert.equal(compareVersions('2.1.9', '2.2.0'), -1);
});

test('aceita o arquivo gerado por Publicar-Atualizacao.ps1', () => {
  const { release, error } = parseRelease(releaseFile());
  assert.equal(error, undefined);
  assert.equal(release.version, '2.2.0');
  assert.ok(release.packageBytes.subarray(0, 2).equals(Buffer.from('PK')));
});

test('recusa arquivo sem assinatura, adulterado ou que não é zip', () => {
  assert.match(parseRelease({ ...releaseFile(), signature: '' }).error, /Assinatura/);
  const tampered = releaseFile();
  tampered.package = Buffer.from('PK\u0003\u0004outro-conteudo').toString('base64');
  assert.match(parseRelease(tampered).error, /hash/);
  assert.match(parseRelease(releaseFile('2.2.0', Buffer.from('MZ-executavel'))).error, /zip/);
  assert.match(parseRelease({ ...releaseFile(), version: '2.2' }).error, /Versão/);
  assert.match(parseRelease({ version: '2.2.0' }).error, /inválido/);
});

function controller(rows) {
  const calls = [];
  const query = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.startsWith('SELECT') && sql.includes('WHERE ativa=TRUE') && !sql.includes('pacote')) return { rows };
    if (sql.startsWith('INSERT')) return { rows: [{ id: 9, versao: values[0], sha256: values[1], tamanho_bytes: values[4], ativa: true, publicado_em: new Date(), revogado_em: null }] };
    return { rows: [] };
  };
  const database = require.resolve('../src/config/database');
  require.cache[database] = { id: database, filename: database, loaded: true, exports: { query } };
  const file = require.resolve('../src/controllers/agentReleaseController');
  delete require.cache[file];
  return { c: require(file), calls };
}
function response() { return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; } }; }

test('agente recebe a maior versão ativa (ordem semântica)', async () => {
  const { c } = controller([{ versao: '2.9.0', sha256: 'a', assinatura: 's1', tamanho_bytes: 1 }, { versao: '2.10.0', sha256: 'b', assinatura: 's2', tamanho_bytes: 2 }]);
  const res = response();
  await c.latestForAgent({}, res);
  assert.deepEqual(res.body, { version: '2.10.0', sha256: 'b', signature: 's2', sizeBytes: 2 });
});

test('sem versão publicada o agente recebe 204', async () => {
  const { c } = controller([]);
  const res = response();
  await c.latestForAgent({}, res);
  assert.equal(res.code, 204);
});

test('publicação exige versão maior que a vigente', async () => {
  const { c, calls } = controller([{ versao: '2.2.0' }]);
  const res = response();
  await c.adminPublish({ body: releaseFile('2.2.0'), user: { id: 1 } }, res);
  assert.equal(res.code, 409);
  assert.equal(calls.some((call) => call.sql.startsWith('INSERT')), false);
  const ok = response();
  await c.adminPublish({ body: releaseFile('2.3.0'), user: { id: 1 } }, ok);
  assert.equal(ok.code, 201);
  assert.equal(ok.body.version, '2.3.0');
});
