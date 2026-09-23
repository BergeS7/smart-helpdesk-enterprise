/**
 * Responsabilidade: Controlador HTTP das versões do agente; publica, lista, revoga e entrega pacotes assinados.
 */
const pool = require("../config/database");
const { compareVersions, parseRelease } = require("../domain/agentRelease");

const RELEASE_FIELDS = "id,versao,sha256,assinatura,tamanho_bytes,ativa,publicado_em,revogado_em";

// Poucas linhas: a ordem semântica (2.10.0 > 2.9.0) é resolvida aqui, não no SQL.
async function latestActive() {
  const result = await pool.query(`SELECT ${RELEASE_FIELDS} FROM agente_versoes WHERE ativa=TRUE`);
  return result.rows.sort((a, b) => compareVersions(b.versao, a.versao))[0] || null;
}

// Agente: consulta a versão vigente. 204 quando não há nenhuma publicada.
async function latestForAgent(_req, res) {
  const release = await latestActive();
  if (!release) return res.status(204).end();
  res.json({ version: release.versao, sha256: release.sha256, signature: release.assinatura, sizeBytes: release.tamanho_bytes });
}

async function packageForAgent(req, res) {
  const result = await pool.query("SELECT pacote FROM agente_versoes WHERE versao=$1 AND ativa=TRUE", [String(req.query.version || "")]);
  if (!result.rows[0]) return res.status(404).json({ erro: "Versão não disponível" });
  res.set("Content-Type", "application/zip").set("Cache-Control", "no-store").send(result.rows[0].pacote);
}

const present = (row) => ({ id: String(row.id), version: row.versao, sha256: row.sha256, sizeBytes: row.tamanho_bytes, active: row.ativa, publishedAt: row.publicado_em, revokedAt: row.revogado_em });

async function adminList(_req, res) {
  const [releases, versions] = await Promise.all([
    pool.query(`SELECT ${RELEASE_FIELDS} FROM agente_versoes ORDER BY publicado_em DESC LIMIT 50`),
    pool.query("SELECT COALESCE(agente_versao,'desconhecida') AS versao, COUNT(*)::int AS total FROM ativos GROUP BY 1"),
  ]);
  const current = releases.rows.filter((row) => row.ativa).sort((a, b) => compareVersions(b.versao, a.versao))[0];
  res.json({
    currentVersion: current?.versao || null,
    releases: releases.rows.map(present),
    agents: versions.rows.map((row) => ({ version: row.versao, total: row.total })).sort((a, b) => compareVersions(b.version, a.version)),
  });
}

async function adminPublish(req, res) {
  const { release, error } = parseRelease(req.body);
  if (error) return res.status(400).json({ erro: error });
  const current = await latestActive();
  if (current && compareVersions(release.version, current.versao) <= 0) return res.status(409).json({ erro: `A versão precisa ser maior que a atual (${current.versao}). Aumente $AgentVersion em SmartHelpDeskAgent.ps1.` });
  const result = await pool.query(
    `INSERT INTO agente_versoes(versao,sha256,assinatura,pacote,tamanho_bytes,publicado_por) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(versao) DO NOTHING RETURNING ${RELEASE_FIELDS}`,
    [release.version, release.sha256, release.signature, release.packageBytes, release.packageBytes.length, req.user?.id || null],
  );
  if (!result.rows[0]) return res.status(409).json({ erro: `A versão ${release.version} já foi publicada. Publique um número novo.` });
  res.status(201).json(present(result.rows[0]));
}

// Revogar só interrompe a distribuição; agentes já atualizados não voltam de versão.
async function adminRevoke(req, res) {
  const result = await pool.query(`UPDATE agente_versoes SET ativa=FALSE,revogado_em=NOW() WHERE id=$1 AND ativa=TRUE RETURNING ${RELEASE_FIELDS}`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ erro: "Versão ativa não encontrada" });
  res.json(present(result.rows[0]));
}

module.exports = { latestForAgent, packageForAgent, adminList, adminPublish, adminRevoke };
