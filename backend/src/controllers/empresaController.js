/**
 * Responsabilidade: cadastro de empresas clientes pela plataforma e o link de liberação que cria o admin.
 * As rotas da plataforma rodam em modo sistema (exigirDonoPlataforma); as públicas não têm empresa no contexto.
 */
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/database");
const { senhaValida } = require("../utils/passwordPolicy");
const { ehEmailDonoPlataforma } = require("../utils/permissoes");
const { recordLegalAcceptance } = require("../services/privacyComplianceService");
const { consultarOperacao, registrarAcesso, listarAcessos } = require("../services/operacaoEmpresaService");
const { CONVITE_VALIDADE_DIAS, gerarSlug, proximoSlugLivre, validarEmpresa } = require("../domain/empresa");

const hash = (valor) => crypto.createHash("sha256").update(String(valor)).digest("hex");
const COLUNAS_EMPRESA = "e.id, e.nome, e.slug, e.cnpj, e.plano, e.status, e.email_responsavel, e.criado_em, e.atualizado_em";

function erroHttp(status, mensagem) {
  return Object.assign(new Error(mensagem), { status });
}

function responderErro(res, error, contexto) {
  if (error.status) return res.status(error.status).json({ erro: error.message });
  if (error.code === "23505") return res.status(409).json({ erro: "Já existe uma empresa com este CNPJ." });
  console.error(`Erro ao ${contexto}:`, error);
  return res.status(500).json({ erro: `Erro ao ${contexto}.` });
}

async function emailEmUso(executor, email) {
  const result = await executor.query("SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER($1)", [email]);
  return result.rows.length > 0;
}

// Um convite válido por vez: gerar outro revoga os pendentes. Devolve o token em claro uma única vez.
async function emitirConvite(client, empresa, criadoPor) {
  if (ehEmailDonoPlataforma(empresa.email_responsavel)) throw erroHttp(400, "Este e-mail é reservado à administração da plataforma.");
  if (await emailEmUso(client, empresa.email_responsavel)) {
    throw erroHttp(409, "O e-mail do responsável já tem uma conta no sistema. Informe outro e-mail para a empresa.");
  }
  await client.query("UPDATE empresa_convites SET revogado_em = NOW() WHERE empresa_id = $1 AND usado_em IS NULL AND revogado_em IS NULL", [empresa.id]);
  const token = crypto.randomBytes(32).toString("base64url");
  const result = await client.query(
    `INSERT INTO empresa_convites (empresa_id, email, token_hash, expira_em, criado_por)
     VALUES ($1, $2, $3, NOW() + make_interval(days => $4), $5)
     RETURNING expira_em`,
    [empresa.id, empresa.email_responsavel, hash(token), CONVITE_VALIDADE_DIAS, criadoPor]
  );
  return { token, expira_em: result.rows[0].expira_em, email: empresa.email_responsavel };
}

async function registrarAuditoria(req, empresaId, acao, descricao) {
  await pool.query(
    `INSERT INTO auditoria_sistema (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao)
     VALUES ($1, $2, 'plataforma', 'empresas', $3, $4, $5)`,
    [req.user.id, req.user.nome, empresaId, acao, descricao]
  ).catch(() => {});
}

async function listarEmpresas(req, res) {
  try {
    const result = await pool.query(`
      SELECT ${COLUNAS_EMPRESA},
        (SELECT COUNT(*)::int FROM usuarios u WHERE u.empresa_id = e.id AND u.status = 'ativo') AS usuarios_ativos,
        (SELECT COUNT(*)::int FROM usuarios u WHERE u.empresa_id = e.id AND u.perfil = 'admin' AND u.status = 'ativo') AS admins,
        (SELECT COUNT(*)::int FROM usuarios u WHERE u.empresa_id = e.id AND u.perfil = 'tecnico' AND u.status = 'ativo') AS tecnicos,
        (SELECT COUNT(*)::int FROM chamados c WHERE c.empresa_id = e.id AND c.status NOT IN ('RESOLVED','CLOSED','CANCELED')) AS chamados_abertos,
        (SELECT COUNT(*)::int FROM ativos a WHERE a.empresa_id = e.id) AS ativos,
        (SELECT MAX(ec.expira_em) FROM empresa_convites ec
          WHERE ec.empresa_id = e.id AND ec.usado_em IS NULL AND ec.revogado_em IS NULL AND ec.expira_em > NOW()) AS convite_pendente_ate
      FROM empresas e
      ORDER BY e.criado_em DESC, e.id DESC`);
    return res.json(result.rows);
  } catch (error) {
    return responderErro(res, error, "listar empresas");
  }
}

async function criarEmpresa(req, res) {
  const { dados, erros } = validarEmpresa(req.body);
  if (erros.length) return res.status(400).json({ erro: erros[0], detalhes: erros });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const base = gerarSlug(dados.nome);
    const ocupados = await client.query("SELECT slug FROM empresas WHERE slug = $1 OR slug LIKE $2", [base, `${base}-%`]);
    const slug = proximoSlugLivre(base, ocupados.rows.map((r) => r.slug));
    const criada = await client.query(
      `INSERT INTO empresas (nome, slug, cnpj, plano, email_responsavel)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, slug, cnpj, plano, status, email_responsavel, criado_em, atualizado_em`,
      [dados.nome, slug, dados.cnpj || null, dados.plano, dados.email_responsavel]
    );
    const empresa = criada.rows[0];
    const convite = await emitirConvite(client, empresa, req.user.id);
    await client.query("COMMIT");
    await registrarAuditoria(req, empresa.id, "criada", `Empresa ${empresa.nome} (${empresa.slug}) cadastrada no plano ${empresa.plano}.`);
    return res.status(201).json({ empresa, convite });
  } catch (error) {
    await client.query("ROLLBACK");
    return responderErro(res, error, "cadastrar empresa");
  } finally {
    client.release();
  }
}

async function atualizarEmpresa(req, res) {
  const { dados, erros } = validarEmpresa(req.body, { parcial: true });
  if (erros.length) return res.status(400).json({ erro: erros[0], detalhes: erros });
  if (!Object.keys(dados).length) return res.status(400).json({ erro: "Nenhum campo para atualizar." });

  try {
    const campos = Object.keys(dados);
    const valores = campos.map((campo) => dados[campo]);
    valores.push(Number(req.params.id));
    const result = await pool.query(
      `UPDATE empresas SET ${campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ")}, atualizado_em = NOW()
       WHERE id = $${valores.length}
       RETURNING id, nome, slug, cnpj, plano, status, email_responsavel, criado_em, atualizado_em`,
      valores
    );
    if (!result.rows[0]) return res.status(404).json({ erro: "Empresa não encontrada." });
    await registrarAuditoria(req, result.rows[0].id, "atualizada", `Campos alterados: ${campos.join(", ")}.`);
    return res.json(result.rows[0]);
  } catch (error) {
    return responderErro(res, error, "atualizar empresa");
  }
}

async function gerarNovoConvite(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT id, nome, email_responsavel, status FROM empresas WHERE id = $1 FOR UPDATE", [Number(req.params.id)]);
    const empresa = result.rows[0];
    if (!empresa) throw erroHttp(404, "Empresa não encontrada.");
    if (empresa.status !== "ativa") throw erroHttp(409, "Reative a empresa antes de gerar um novo link.");
    if (!empresa.email_responsavel) throw erroHttp(400, "Cadastre o e-mail do responsável antes de gerar o link.");
    const convite = await emitirConvite(client, empresa, req.user.id);
    await client.query("COMMIT");
    await registrarAuditoria(req, empresa.id, "convite_gerado", `Novo link de liberação para ${empresa.email_responsavel}.`);
    return res.status(201).json({ convite });
  } catch (error) {
    await client.query("ROLLBACK");
    return responderErro(res, error, "gerar link de liberação");
  } finally {
    client.release();
  }
}

// A plataforma só visualiza a operação do cliente, e o acesso fica registrado antes da consulta.
async function operacaoEmpresa(req, res) {
  try {
    const empresaId = Number(req.params.id);
    const empresa = await pool.query("SELECT id, nome, slug, plano, status FROM empresas WHERE id = $1", [empresaId]);
    if (!empresa.rows[0]) return res.status(404).json({ erro: "Empresa não encontrada." });
    await registrarAcesso({ empresaId, user: req.user, recurso: "operacao", req });
    const operacao = await consultarOperacao(empresaId);
    return res.json({ empresa: empresa.rows[0], ...operacao });
  } catch (error) {
    return responderErro(res, error, "consultar a operação da empresa");
  }
}

async function acessosEmpresa(req, res) {
  try {
    return res.json(await listarAcessos(Number(req.params.id)));
  } catch (error) {
    return responderErro(res, error, "listar acessos da plataforma");
  }
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

// Usado pelo cadastro público: resolve a empresa do link, ou null quando o slug não serve.
async function empresaAtivaPorSlug(slug) {
  const result = await pool.query("SELECT id FROM empresas WHERE slug = $1 AND status = 'ativa'", [String(slug || "")]);
  return result.rows[0]?.id || null;
}

module.exports = {
  listarEmpresas, criarEmpresa, atualizarEmpresa, gerarNovoConvite, operacaoEmpresa, acessosEmpresa,
  consultarConvite, ativarConvite, empresaPublica, empresaAtivaPorSlug,
};
