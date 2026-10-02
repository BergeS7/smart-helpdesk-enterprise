/**
 * Responsabilidade: páginas públicas das empresas: o link de liberação que cria o admin, o link de
 * cadastro da equipe e as unidades da empresa. A gestão das empresas é feita pelo Console Berges7
 * (services/empresasPlataformaService.js, pela API interna).
 */
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/database");
const { senhaValida } = require("../utils/passwordPolicy");
const { recordLegalAcceptance } = require("../services/privacyComplianceService");
const { listarUnidades } = require("../services/localidadesService");
const { EMPRESA_PRINCIPAL, executarComoEmpresa } = require("../config/tenantContext");

const hash = (valor) => crypto.createHash("sha256").update(String(valor)).digest("hex");

function erroHttp(status, mensagem) {
  return Object.assign(new Error(mensagem), { status });
}

function responderErro(res, error, contexto) {
  if (error.status) return res.status(error.status).json({ erro: error.message });
  if (error.code === "23505") {
    const conflitos = {
      uq_empresas_cnpj: "Já existe uma empresa com este CNPJ.",
      uq_empresas_slug: "Outra empresa acabou de ser cadastrada com um nome parecido. Tente novamente.",
      usuarios_email_key: "Já existe uma conta com este e-mail.",
    };
    return res.status(409).json({ erro: conflitos[error.constraint] || "Registro duplicado." });
  }
  console.error(`Erro ao ${contexto}:`, error);
  return res.status(500).json({ erro: `Erro ao ${contexto}.` });
}

async function emailEmUso(executor, email) {
  const result = await executor.query("SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER($1)", [email]);
  return result.rows.length > 0;
}

// ---- Rotas públicas (sem login) ----

async function conviteValido(executor, token, { bloquear = false } = {}) {
  const result = await executor.query(
    `SELECT ec.id, ec.email, ec.empresa_id, e.nome AS empresa_nome, e.slug AS empresa_slug
       FROM empresa_convites ec JOIN empresas e ON e.id = ec.empresa_id
      WHERE ec.token_hash = $1 AND ec.usado_em IS NULL AND ec.revogado_em IS NULL
        AND ec.expira_em > NOW() AND e.status = 'ativa'
      ${bloquear ? "FOR UPDATE OF ec" : ""}`,
    [hash(token)]
  );
  return result.rows[0] || null;
}

async function consultarConvite(req, res) {
  try {
    const convite = await conviteValido(pool, req.params.token);
    if (!convite) return res.status(404).json({ erro: "Link de liberação inválido, expirado ou já utilizado." });
    return res.json({ empresa: { nome: convite.empresa_nome, slug: convite.empresa_slug }, email: convite.email });
  } catch (error) {
    return responderErro(res, error, "consultar link de liberação");
  }
}

// O responsável cria a própria senha e vira o primeiro admin da empresa (e-mail já confirmado pelo link).
async function ativarConvite(req, res) {
  const { nome, senha, telefone, cargo, aceitaTermos } = req.body || {};
  if (!String(nome || "").trim()) return res.status(400).json({ erro: "Informe seu nome." });
  if (!senhaValida(senha)) return res.status(400).json({ erro: "A senha deve ter ao menos 8 caracteres." });
  if (aceitaTermos !== true) return res.status(400).json({ erro: "Leia e aceite os Termos de Uso e a Política de Privacidade." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const convite = await conviteValido(client, req.params.token, { bloquear: true });
    if (!convite) throw erroHttp(404, "Link de liberação inválido, expirado ou já utilizado.");
    if (await emailEmUso(client, convite.email)) throw erroHttp(409, "Já existe uma conta com o e-mail deste link. Peça um novo link à administração.");

    const senhaHash = await bcrypt.hash(String(senha), 10);
    const criado = await client.query(
      `INSERT INTO usuarios (nome, email, senha, perfil, status, telefone, cargo, aprovado_em, email_verificado_em, empresa_id)
       VALUES ($1, LOWER($2), $3, 'admin', 'ativo', $4, $5, NOW(), NOW(), $6)
       RETURNING id`,
      [String(nome).trim(), convite.email, senhaHash, String(telefone || "").trim(), String(cargo || "").trim() || "Administrador", convite.empresa_id]
    );
    await client.query("UPDATE empresa_convites SET usado_em = NOW() WHERE id = $1", [convite.id]);
    await client.query("COMMIT");
    await recordLegalAcceptance({ userId: criado.rows[0].id, req }).catch(() => {});
    return res.status(201).json({
      mensagem: `Acesso liberado. Entre com ${convite.email} e a senha que você criou.`,
      email: convite.email,
      empresa: { nome: convite.empresa_nome, slug: convite.empresa_slug },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return responderErro(res, error, "ativar acesso da empresa");
  } finally {
    client.release();
  }
}

// Página /cadastro/<slug>: só confirma que a empresa existe e está ativa.
async function empresaPublica(req, res) {
  try {
    const result = await pool.query("SELECT nome, slug FROM empresas WHERE slug = $1 AND status = 'ativa'", [String(req.params.slug || "")]);
    if (!result.rows[0]) return res.status(404).json({ erro: "Link de cadastro inválido ou empresa indisponível." });
    return res.json(result.rows[0]);
  } catch (error) {
    return responderErro(res, error, "consultar empresa");
  }
}

// Unidades onde a pessoa pode trabalhar: as da empresa do usuário logado, as da empresa do link
// de cadastro (?empresa=<slug>) ou, na tela de login sem link, as da empresa principal.
async function localidades(req, res) {
  try {
    let empresaId = req.user?.empresaId;
    if (!empresaId) empresaId = req.query.empresa ? await empresaAtivaPorSlug(req.query.empresa) : EMPRESA_PRINCIPAL;
    if (!empresaId) return res.status(404).json({ erro: "Link de cadastro inválido ou empresa indisponível." });
    const unidades = await executarComoEmpresa(empresaId, () => listarUnidades());
    return res.json(unidades.map(({ id, nome, municipio, latitude, longitude }) => ({ id, nome, municipio, latitude, longitude })));
  } catch (error) {
    return responderErro(res, error, "listar unidades");
  }
}

// Usado pelo cadastro público: resolve a empresa do link, ou null quando o slug não serve.
async function empresaAtivaPorSlug(slug) {
  const result = await pool.query("SELECT id FROM empresas WHERE slug = $1 AND status = 'ativa'", [String(slug || "")]);
  return result.rows[0]?.id || null;
}

module.exports = {
  consultarConvite, ativarConvite, empresaPublica, empresaAtivaPorSlug, localidades,
};
