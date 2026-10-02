/**
 * Responsabilidade: gestão das empresas clientes (cadastrar, alterar, gerar link de liberação).
 * Quem chama é o Console Berges7 pela API interna; roda em modo sistema e registra na auditoria
 * da própria empresa quem fez a alteração.
 */
const crypto = require("crypto");
const pool = require("../config/database");
const { ehEmailDonoPlataforma } = require("../utils/permissoes");
const { EMPRESA_PRINCIPAL } = require("../config/tenantContext");
const { CONVITE_VALIDADE_DIAS, gerarSlug, proximoSlugLivre, validarEmpresa } = require("../domain/empresa");
const { enviarEmail } = require("./emailService");
const { emailLiberacao } = require("./emailModelos");
const { configuracoesDaEmpresa } = require("./emailMarcaEmpresa");
const { urlBasePortal } = require("./ticketRatingEmailService");

const hash = (valor) => crypto.createHash("sha256").update(String(valor)).digest("hex");
const RETORNO_EMPRESA = "id, nome, slug, cnpj, plano, status, email_responsavel, criado_em, atualizado_em";

function erroHttp(status, mensagem) {
  return Object.assign(new Error(mensagem), { status });
}

const CONFLITOS = {
  uq_empresas_cnpj: "Já existe uma empresa com este CNPJ.",
  uq_empresas_slug: "Outra empresa acabou de ser cadastrada com um nome parecido. Tente novamente.",
};

/** Converte erro do banco em erro com status (409 para duplicidade); o resto segue como está. */
function traduzirErro(error) {
  if (error.code === "23505") return erroHttp(409, CONFLITOS[error.constraint] || "Registro duplicado.");
  return error;
}

function validarOuFalhar(resultado) {
  if (resultado.erros.length) throw erroHttp(400, resultado.erros[0]);
  return resultado.dados;
}

async function emailEmUso(executor, email) {
  const result = await executor.query("SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER($1)", [email]);
  return result.rows.length > 0;
}

// Um convite válido por vez: gerar outro revoga os pendentes. Devolve o token em claro uma única vez.
async function emitirConvite(client, empresa) {
  if (ehEmailDonoPlataforma(empresa.email_responsavel)) throw erroHttp(400, "Este e-mail é reservado à administração da plataforma.");
  if (await emailEmUso(client, empresa.email_responsavel)) {
    throw erroHttp(409, "O e-mail do responsável já tem uma conta no sistema. Informe outro e-mail para a empresa.");
  }
  await client.query("UPDATE empresa_convites SET revogado_em = NOW() WHERE empresa_id = $1 AND usado_em IS NULL AND revogado_em IS NULL", [empresa.id]);
  const token = crypto.randomBytes(32).toString("base64url");
  const result = await client.query(
    `INSERT INTO empresa_convites (empresa_id, email, token_hash, expira_em)
     VALUES ($1, $2, $3, NOW() + make_interval(days => $4))
     RETURNING expira_em`,
    [empresa.id, empresa.email_responsavel, hash(token), CONVITE_VALIDADE_DIAS]
  );
  return { token, expira_em: result.rows[0].expira_em, email: empresa.email_responsavel };
}

// Sem usuário do HelpDesk por trás: a empresa vai explícita (o gatilho de herança não teria de onde tirar).
async function auditar(executor, autor, empresaId, acao, descricao) {
  await executor.query(
    `INSERT INTO auditoria_sistema (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao, empresa_id)
     VALUES (NULL, $1, 'plataforma', 'empresas', $2, $3, $4, $2)`,
    [autor, empresaId, acao, descricao]
  );
}

async function emTransacao(trabalho) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await trabalho(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    await client.query("ROLLBACK");
    throw traduzirErro(error);
  } finally {
    client.release();
  }
}

/** Cadastra a empresa e já devolve o link de liberação do responsável. */
async function criarEmpresa(entrada, autor) {
  const dados = validarOuFalhar(validarEmpresa(entrada));
  return emTransacao(async (client) => {
    const base = gerarSlug(dados.nome);
    const ocupados = await client.query("SELECT slug FROM empresas WHERE slug = $1 OR slug LIKE $2", [base, `${base}-%`]);
    const slug = proximoSlugLivre(base, ocupados.rows.map((r) => r.slug));
    const empresa = (await client.query(
      `INSERT INTO empresas (nome, slug, cnpj, plano, email_responsavel) VALUES ($1, $2, $3, $4, $5) RETURNING ${RETORNO_EMPRESA}`,
      [dados.nome, slug, dados.cnpj || null, dados.plano, dados.email_responsavel]
    )).rows[0];
    const convite = await emitirConvite(client, empresa);
    await auditar(client, autor, empresa.id, "criada", `Empresa ${empresa.nome} (${empresa.slug}) cadastrada no plano ${empresa.plano}.`);
    return { empresa, convite };
  });
}

/** Altera nome, CNPJ, e-mail do responsável, plano ou situação (só os campos enviados). */
async function atualizarEmpresa(id, entrada, autor) {
  const dados = validarOuFalhar(validarEmpresa(entrada, { parcial: true }));
  const campos = Object.keys(dados);
  if (!campos.length) throw erroHttp(400, "Nenhum campo para atualizar.");
  // A principal abriga a conta do dono e os dados de antes do SaaS: suspender travaria a operação inteira.
  if (Number(id) === EMPRESA_PRINCIPAL && dados.status && dados.status !== "ativa") throw erroHttp(409, "A empresa principal não pode ser suspensa nem cancelada.");
  return emTransacao(async (client) => {
    const empresa = (await client.query(
      `UPDATE empresas SET ${campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ")}, atualizado_em = NOW()
       WHERE id = $${campos.length + 1} RETURNING ${RETORNO_EMPRESA}`,
      [...campos.map((campo) => dados[campo]), Number(id)]
    )).rows[0];
    if (!empresa) throw erroHttp(404, "Empresa não encontrada.");
    await auditar(client, autor, empresa.id, "atualizada", `Campos alterados: ${campos.join(", ")}.`);
    return empresa;
  });
}

/** Novo link de liberação (revoga o anterior); só para empresa ativa com e-mail do responsável. */
async function gerarNovoConvite(id, autor) {
  return emTransacao(async (client) => {
    const empresa = (await client.query("SELECT id, nome, email_responsavel, status FROM empresas WHERE id = $1 FOR UPDATE", [Number(id)])).rows[0];
    if (!empresa) throw erroHttp(404, "Empresa não encontrada.");
    if (empresa.status !== "ativa") throw erroHttp(409, "Reative a empresa antes de gerar um novo link.");
    if (!empresa.email_responsavel) throw erroHttp(400, "Cadastre o e-mail do responsável antes de gerar o link.");
    const convite = await emitirConvite(client, empresa);
    await auditar(client, autor, empresa.id, "convite_gerado", `Novo link de liberação para ${empresa.email_responsavel}.`);
    return { empresa, convite };
  });
}

/**
 * Endereço do portal para o link: o pedido pode sugerir um (o console manda o dele), mas só vale se
 * for uma das origens liberadas no CORS; senão, o endereço padrão do portal.
 */
function basePortal(sugerida, env = process.env) {
  const liberadas = String(env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  try {
    const origem = new URL(String(sugerida)).origin;
    if (liberadas.includes(origem)) return origem;
  } catch {
    // sugestão inválida: cai no padrão
  }
  return urlBasePortal(env);
}

/** Manda o link de liberação ao responsável. Falha de envio não desfaz o cadastro: o link segue na resposta. */
async function enviarLinkLiberacao({ empresa, convite, linkBase }) {
  const base = basePortal(linkBase);
  if (!base) return { enviado: false, motivo: "Endereço do portal não configurado." };
  try {
    const config = await configuracoesDaEmpresa(empresa.id);
    const email = emailLiberacao({ empresa: empresa.nome, link: `${base}/ativar/${convite.token}`, expiraEm: convite.expira_em, config });
    return await enviarEmail({ para: convite.email, ...email });
  } catch (error) {
    console.error("Erro ao enviar o link de liberação:", error.message);
    return { enviado: false, motivo: error.message };
  }
}

module.exports = { criarEmpresa, atualizarEmpresa, gerarNovoConvite, enviarLinkLiberacao, basePortal };
