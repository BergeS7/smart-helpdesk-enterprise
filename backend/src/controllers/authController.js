const crypto = require("crypto");
const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { enviarEmail } = require("../services/emailService");
const { montarUrlFotoPerfil } = require("../utils/profilePhoto");
const { normalizarPerfil } = require("../utils/permissoes");

function gerarToken(usuario) {
  const perfilNormalizado = normalizarPerfil(usuario.perfil);

  return jwt.sign(
    {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: perfilNormalizado,
      tokenVersion: Number(usuario.token_version || 1),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    }
  );
}

function senhaForte(senha) {
  const valor = String(senha || "");
  return valor.length >= 12 && /[a-z]/.test(valor) && /[A-Z]/.test(valor) && /\d/.test(valor) && /[^A-Za-z0-9]/.test(valor);
}

function montarUsuarioPublico(usuario, req = null) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: normalizarPerfil(usuario.perfil),
    status: usuario.status || "ativo",
    telefone: usuario.telefone || "",
    departamento: usuario.departamento || "",
    cargo: usuario.cargo || "",
    foto_url: montarUrlFotoPerfil(req, usuario.id),
  };
}

function mensagemStatusUsuario(status) {
  if (status === "pendente") {
    return "Seu cadastro ainda está aguardando aprovação do administrador.";
  }

  if (status === "rejeitado") {
    return "Seu cadastro foi rejeitado pelo administrador.";
  }

  if (status === "inativo") {
    return "Seu usuário está inativo. Entre em contato com o suporte.";
  }

  return "Usuário não está ativo.";
}

async function registrarAuditoria(usuario, acao, descricao) {
  await pool
    .query(
      `INSERT INTO auditoria_sistema
       (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao)
       VALUES ($1, $2, $3, 'auth', $1, $4, $5)`,
      [
        usuario?.id || null,
        usuario?.nome || "Sistema",
        normalizarPerfil(usuario?.perfil || "sistema"),
        acao,
        descricao,
      ]
    )
    .catch(() => {});
}

function normalizarListaPerfis(perfisPermitidos = []) {
  return perfisPermitidos.map((perfil) => normalizarPerfil(perfil));
}

function loginEhDeEquipe(perfisPermitidosNormalizados = []) {
  return perfisPermitidosNormalizados.some((perfil) =>
    ["tecnico", "admin", "desenvolvedor"].includes(perfil)
  );
}

async function executarLogin(req, res, perfisPermitidos) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: "Informe e-mail e senha",
      });
    }

    const result = await pool.query(
      `SELECT
          id,
          nome,
          email,
          senha,
          COALESCE(perfil, 'usuario') AS perfil,
          COALESCE(status, 'ativo') AS status,
          telefone,
          departamento,
          cargo,
          tentativas_login,
          bloqueado_ate
          ,COALESCE(token_version, 1) AS token_version
       FROM usuarios
       WHERE LOWER(email) = LOWER($1)`,
      [String(email).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        erro: "Credenciais inválidas",
      });
    }

    const usuario = {
      ...result.rows[0],
      perfil: normalizarPerfil(result.rows[0].perfil),
    };

    if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
      return res.status(423).json({
        erro: "Usuário temporariamente bloqueado por excesso de tentativas. Tente novamente mais tarde.",
      });
    }

    const senhaValida = await bcrypt.compare(String(senha), usuario.senha);

    if (!senhaValida) {
      const tentativas = Number(usuario.tentativas_login || 0) + 1;
      const bloquear = tentativas >= 5;

      await pool.query(
        `UPDATE usuarios
         SET
          tentativas_login = $1,
          bloqueado_ate = CASE
            WHEN $2 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
            ELSE bloqueado_ate
          END
         WHERE id = $3`,
        [tentativas, bloquear, usuario.id]
      );

      await registrarAuditoria(
        usuario,
        "login_falhou",
        `Tentativa de login inválida. Tentativas: ${tentativas}`
      );

      return res.status(401).json({
        erro: bloquear
          ? "Muitas tentativas inválidas. Usuário bloqueado por 15 minutos."
          : "Credenciais inválidas",
      });
    }

    const perfisPermitidosNormalizados = normalizarListaPerfis(perfisPermitidos);

    if (!perfisPermitidosNormalizados.includes(usuario.perfil)) {
      const loginEquipe = loginEhDeEquipe(perfisPermitidosNormalizados);

      return res.status(403).json({
        erro: loginEquipe
          ? "Este usuário não tem permissão para acessar o painel"
          : "Este login é exclusivo para usuários comuns",
      });
    }

    if (usuario.status !== "ativo") {
      return res.status(403).json({
        erro: mensagemStatusUsuario(usuario.status),
        status: usuario.status,
      });
    }

    await pool.query(
      `UPDATE usuarios
       SET
        tentativas_login = 0,
        bloqueado_ate = NULL,
        ultimo_login_em = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [usuario.id]
    );

    await registrarAuditoria(
      usuario,
      "login",
      `Login realizado como ${usuario.perfil}`
    );

    return res.json({
      usuario: montarUsuarioPublico(usuario, req),
      token: gerarToken(usuario),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao realizar login",
      detalhe: error.message,
    });
  }
}

/**
 * Login exclusivo para usuário comum.
 * Use quando quiser bloquear técnico/admin/dev nessa área.
 */
const loginUsuario = (req, res) =>
  executarLogin(req, res, ["usuario"]);

/**
 * Login do painel administrativo/equipe.
 * Permite técnico, administrador e desenvolvedor.
 */
const loginAdmin = (req, res) =>
  executarLogin(req, res, [
    "tecnico",
    "admin",
    "administrador",
    "desenvolvedor",
    "super_admin",
    "dev",
    "developer",
  ]);

/**
 * Login genérico.
 * Permite qualquer perfil ativo entrar e o frontend decide para qual painel enviar.
 * Isso corrige o problema do dev cair no bloqueio de "usuário comum".
 */
const login = (req, res) =>
  executarLogin(req, res, [
    "usuario",
    "tecnico",
    "admin",
    "administrador",
    "desenvolvedor",
    "super_admin",
    "dev",
    "developer",
  ]);

const solicitarRecuperacaoSenha = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        erro: "Informe o e-mail",
      });
    }

    const result = await pool.query(
      `SELECT id, nome, email, perfil
       FROM usuarios
       WHERE LOWER(email) = LOWER($1)`,
      [String(email).trim()]
    );

    if (result.rows.length === 0) {
      return res.json({
        mensagem: "Se o e-mail existir, enviaremos as instruções de recuperação.",
      });
    }

    const usuario = result.rows[0];
    const codigo = crypto.randomInt(100000, 999999).toString();
    const codigoHash = crypto.createHash("sha256").update(codigo).digest("hex");

    await pool.query(
      `UPDATE usuarios
       SET
        reset_token = NULL,
        reset_token_hash = $1,
        reset_expira_em = CURRENT_TIMESTAMP + INTERVAL '20 minutes',
        reset_tentativas = 0,
        reset_bloqueado_ate = NULL,
        reset_solicitado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [codigoHash, usuario.id]
    );

    await enviarEmail({
      para: usuario.email,
      assunto: "Recuperação de senha - Smart HelpDesk",
      texto: `Seu código de recuperação é: ${codigo}. Ele expira em 20 minutos.`,
    });

    await registrarAuditoria(
      usuario,
      "recuperacao_senha",
      "Código de recuperação solicitado"
    );

    return res.json({
      mensagem: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao solicitar recuperação",
      detalhe: error.message,
    });
  }
};

const redefinirSenha = async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;

    if (!email || !codigo || !novaSenha) {
      return res.status(400).json({
        erro: "Informe e-mail, código e nova senha",
      });
    }
    if (!senhaForte(novaSenha)) return res.status(400).json({ erro: "A nova senha deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo." });

    const result = await pool.query(
      `SELECT
          id,
          nome,
          email,
          perfil,
          reset_token_hash,
          reset_expira_em,
          reset_tentativas,
          reset_bloqueado_ate
       FROM usuarios
       WHERE LOWER(email) = LOWER($1)`,
      [String(email).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        erro: "Código inválido ou expirado",
      });
    }

    const usuario = result.rows[0];

    const codigoHash = crypto.createHash("sha256").update(String(codigo)).digest("hex");
    if (usuario.reset_bloqueado_ate && new Date(usuario.reset_bloqueado_ate) > new Date()) return res.status(429).json({ erro: "Muitas tentativas. Solicite um novo código mais tarde." });
    if (
      !usuario.reset_token_hash ||
      usuario.reset_token_hash !== codigoHash ||
      !usuario.reset_expira_em ||
      new Date(usuario.reset_expira_em) < new Date()
    ) {
      const tentativas = Number(usuario.reset_tentativas || 0) + 1;
      await pool.query("UPDATE usuarios SET reset_tentativas=$1, reset_bloqueado_ate=CASE WHEN $1>=5 THEN NOW()+INTERVAL '30 minutes' ELSE reset_bloqueado_ate END WHERE id=$2", [tentativas, usuario.id]);
      return res.status(400).json({
        erro: "Código inválido ou expirado",
      });
    }

    const hash = await bcrypt.hash(String(novaSenha), 10);

    await pool.query(
      `UPDATE usuarios
       SET
        senha = $1,
        reset_token = NULL,
        reset_token_hash = NULL,
        reset_expira_em = NULL,
        reset_tentativas = 0,
        reset_bloqueado_ate = NULL,
        tentativas_login = 0,
        bloqueado_ate = NULL,
        token_version = COALESCE(token_version,1) + 1
       WHERE id = $2`,
      [hash, usuario.id]
    );

    await registrarAuditoria(
      usuario,
      "senha_redefinida",
      "Senha redefinida via recuperação"
    );

    return res.json({
      mensagem: "Senha redefinida com sucesso",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao redefinir senha",
      detalhe: error.message,
    });
  }
};

module.exports = {
  login,
  loginUsuario,
  loginAdmin,
  solicitarRecuperacaoSenha,
  redefinirSenha,
};
