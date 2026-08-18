const bcrypt = require("bcrypt");
const pool = require("../config/database");
const { montarUrlFotoPerfil, limparFotosPerfil } = require("../utils/profilePhoto");
const { recordLegalAcceptance } = require("../services/privacyComplianceService");
const { validLocation } = require("../domain/serviceArea");

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function senhaForte(senha) {
  const valor = String(senha || "");
  return valor.length >= 12 && /[a-z]/.test(valor) && /[A-Z]/.test(valor) && /\d/.test(valor) && /[^A-Za-z0-9]/.test(valor);
}

function normalizarPerfilUsuario(perfil) {
  const valor = String(perfil || "usuario").trim().toLowerCase();

  if (["super_admin", "dev", "developer"].includes(valor)) {
    return "desenvolvedor";
  }

  if (["administrador"].includes(valor)) {
    return "admin";
  }

  if (["usuario", "tecnico", "admin", "desenvolvedor"].includes(valor)) {
    return valor;
  }

  return "usuario";
}

function normalizarStatusUsuario(status) {
  const valor = String(status || "ativo").trim().toLowerCase();

  if (["ativo", "pendente", "rejeitado", "inativo"].includes(valor)) {
    return valor;
  }

  return "ativo";
}

function perfilDoRequest(req) {
  return normalizarPerfilUsuario(req.user?.perfil || req.usuario?.perfil || "usuario");
}

function usuarioIdDoRequest(req) {
  return req.user?.id || req.usuario?.id || null;
}

function montarUsuarioPublico(usuario, req = null) {
  return {
    id: usuario.id,
    nome: usuario.nome || "",
    email: usuario.email || "",
    perfil: normalizarPerfilUsuario(usuario.perfil),
    status: usuario.status || "ativo",
    telefone: usuario.telefone || "",
    departamento: usuario.departamento || "",
    municipio: usuario.municipio || "",
    unidade: usuario.unidade || "",
    cargo: usuario.cargo || "",
    criado_em: usuario.criado_em || null,
    aprovado_em: usuario.aprovado_em || null,
    aprovado_por: usuario.aprovado_por || null,
    ultimo_login_em: usuario.ultimo_login_em || null,
    bloqueado_ate: usuario.bloqueado_ate || null,
    foto_url: montarUrlFotoPerfil(req, usuario.id),
  };
}

async function buscarUsuarioPorId(id, req = null) {
  const result = await pool.query(
    `SELECT
        id,
        nome,
        email,
        COALESCE(perfil, 'usuario') AS perfil,
        COALESCE(status, 'ativo') AS status,
        telefone,
        departamento,
        municipio,
        unidade,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate
     FROM usuarios
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return montarUsuarioPublico(result.rows[0], req);
}

async function emailJaExiste(email, ignorarId = null) {
  const params = [normalizarEmail(email)];
  let query = "SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)";

  if (ignorarId) {
    params.push(ignorarId);
    query += " AND id <> $2";
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

async function registrarAuditoria(req, entidadeId, acao, descricao) {
  const autorId = usuarioIdDoRequest(req);
  const autorNome = req.user?.nome || req.usuario?.nome || "Sistema";
  const autorPerfil = perfilDoRequest(req);

  await pool
    .query(
      `INSERT INTO auditoria_sistema
       (usuario_id, autor_nome, autor_perfil, entidade, entidade_id, acao, descricao)
       VALUES ($1, $2, $3, 'usuarios', $4, $5, $6)`,
      [autorId, autorNome, autorPerfil, entidadeId || autorId, acao, descricao]
    )
    .catch(() => {});
}

async function criarPrimeiroAdmin(req, res) {
  try {
    const total = await pool.query("SELECT COUNT(*)::int AS total FROM usuarios");

    if (Number(total.rows[0]?.total || 0) > 0) {
      return res.status(403).json({
        erro: "O primeiro administrador só pode ser criado quando não existem usuários cadastrados.",
      });
    }

    const { nome, email, senha, telefone, departamento, cargo } = req.body;

    if (!normalizarTexto(nome) || !normalizarEmail(email) || !normalizarTexto(senha)) {
      return res.status(400).json({
        erro: "Informe nome, e-mail e senha.",
      });
    }
    if (!senhaForte(senha)) return res.status(400).json({ erro: "A senha deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo." });

    const senhaHash = await bcrypt.hash(String(senha), 10);

    const result = await pool.query(
      `INSERT INTO usuarios
       (nome, email, senha, perfil, status, telefone, departamento, cargo, aprovado_em)
       VALUES ($1, LOWER($2), $3, 'desenvolvedor', 'ativo', $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      [
        normalizarTexto(nome),
        normalizarEmail(email),
        senhaHash,
        normalizarTexto(telefone),
        normalizarTexto(departamento) || "Desenvolvimento",
        normalizarTexto(cargo) || "Desenvolvedor",
      ]
    );

    return res.status(201).json({
      mensagem: "Primeiro administrador/desenvolvedor criado com sucesso.",
      usuario: montarUsuarioPublico(result.rows[0], req),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao criar primeiro administrador",
      detalhe: error.message,
    });
  }
}

async function cadastrarUsuarioPublico(req, res) {
  try {
    const { nome, email, senha, telefone, departamento, municipio, unidade, cargo, aceitaTermos } = req.body;
    if (!validLocation(municipio, unidade)) return res.status(400).json({ erro: "Município ou unidade fora da área de atuação." });

    if (!normalizarTexto(nome) || !normalizarEmail(email) || !normalizarTexto(senha)) {
      return res.status(400).json({
        erro: "Informe nome, e-mail e senha.",
      });
    }
    if (!senhaForte(senha)) return res.status(400).json({ erro: "A senha deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo." });

    if (aceitaTermos !== true) {
      return res.status(400).json({ erro: "Leia e aceite os Termos de Uso e a Política de Privacidade." });
    }

    if (await emailJaExiste(email)) {
      return res.status(409).json({
        erro: "Já existe um usuário cadastrado com este e-mail.",
      });
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);

    const result = await pool.query(
      `INSERT INTO usuarios
       (nome, email, senha, perfil, status, telefone, departamento, municipio, unidade, cargo)
       VALUES ($1, LOWER($2), $3, 'usuario', 'pendente', $4, $5, $6, $7, $8)
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        municipio,
        unidade,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      [
        normalizarTexto(nome),
        normalizarEmail(email),
        senhaHash,
        normalizarTexto(telefone),
        normalizarTexto(departamento),
        normalizarTexto(municipio),
        normalizarTexto(unidade),
        normalizarTexto(cargo),
      ]
    );

    await recordLegalAcceptance({ userId: result.rows[0].id, req });

    return res.status(201).json({
      mensagem: "Cadastro solicitado com sucesso. Aguarde aprovação do administrador.",
      usuario: montarUsuarioPublico(result.rows[0], req),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao solicitar cadastro",
      detalhe: error.message,
    });
  }
}

async function createUser(req, res) {
  try {
    const perfilAutor = perfilDoRequest(req);
    const { nome, email, senha, perfil, status, telefone, departamento, municipio, unidade, cargo } = req.body;
    if (!validLocation(municipio, unidade)) return res.status(400).json({ erro: "Município ou unidade fora da área de atuação." });

    if (!normalizarTexto(nome) || !normalizarEmail(email) || !normalizarTexto(senha)) {
      return res.status(400).json({
        erro: "Informe nome, e-mail e senha.",
      });
    }
    if (!senhaForte(senha)) return res.status(400).json({ erro: "A senha deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo." });

    if (await emailJaExiste(email)) {
      return res.status(409).json({
        erro: "Já existe um usuário cadastrado com este e-mail.",
      });
    }

    let perfilNovo = normalizarPerfilUsuario(perfil || "usuario");

    if (perfilAutor !== "desenvolvedor" && ["admin", "desenvolvedor"].includes(perfilNovo)) {
      return res.status(403).json({
        erro: "Somente desenvolvedor pode criar administradores ou desenvolvedores.",
      });
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);

    const result = await pool.query(
      `INSERT INTO usuarios
       (nome, email, senha, perfil, status, telefone, departamento, municipio, unidade, cargo, aprovado_por, aprovado_em)
       VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        municipio,
        unidade,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      [
        normalizarTexto(nome),
        normalizarEmail(email),
        senhaHash,
        perfilNovo,
        normalizarStatusUsuario(status || "ativo"),
        normalizarTexto(telefone),
        normalizarTexto(departamento),
        normalizarTexto(municipio),
        normalizarTexto(unidade),
        normalizarTexto(cargo),
        usuarioIdDoRequest(req),
      ]
    );

    await registrarAuditoria(req, result.rows[0].id, "criado", `Usuário ${result.rows[0].email} criado.`);

    return res.status(201).json(montarUsuarioPublico(result.rows[0], req));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao criar usuário",
      detalhe: error.message,
    });
  }
}

async function listarUsuarios(req, res) {
  try {
    const { status, perfil, q } = req.query;
    const params = [];
    const where = [];

    if (status) {
      params.push(normalizarStatusUsuario(status));
      where.push(`COALESCE(status, 'ativo') = $${params.length}`);
    }

    if (perfil) {
      params.push(normalizarPerfilUsuario(perfil));
      where.push(`COALESCE(perfil, 'usuario') = $${params.length}`);
    }

    if (q) {
      params.push(`%${String(q).trim()}%`);
      where.push(`(nome ILIKE $${params.length} OR email ILIKE $${params.length} OR departamento ILIKE $${params.length} OR cargo ILIKE $${params.length})`);
    }

    const result = await pool.query(
      `SELECT
          id,
          nome,
          email,
          COALESCE(perfil, 'usuario') AS perfil,
          COALESCE(status, 'ativo') AS status,
          telefone,
          departamento,
          cargo,
          criado_em,
          aprovado_em,
          aprovado_por,
          ultimo_login_em,
          bloqueado_ate
       FROM usuarios
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY criado_em DESC, id DESC`,
      params
    );

    return res.json(result.rows.map((usuario) => montarUsuarioPublico(usuario, req)));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao listar usuários",
      detalhe: error.message,
    });
  }
}

async function aprovarUsuario(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE usuarios
       SET
        status = 'ativo',
        token_version = COALESCE(token_version, 1) + 1,
        aprovado_por = $1,
        aprovado_em = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      [usuarioIdDoRequest(req), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    await registrarAuditoria(req, id, "aprovado", `Usuário ${result.rows[0].email} aprovado.`);

    return res.json({
      mensagem: "Usuário aprovado com sucesso.",
      usuario: montarUsuarioPublico(result.rows[0], req),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao aprovar usuário",
      detalhe: error.message,
    });
  }
}

async function rejeitarUsuario(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE usuarios
       SET
        status = 'rejeitado',
        token_version = COALESCE(token_version, 1) + 1,
        aprovado_por = $1,
        aprovado_em = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      [usuarioIdDoRequest(req), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    await registrarAuditoria(req, id, "rejeitado", `Usuário ${result.rows[0].email} rejeitado.`);

    return res.json({
      mensagem: "Usuário rejeitado com sucesso.",
      usuario: montarUsuarioPublico(result.rows[0], req),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao rejeitar usuário",
      detalhe: error.message,
    });
  }
}

async function atualizarUsuarioAdmin(req, res) {
  try {
    const perfilAutor = perfilDoRequest(req);

    if (perfilAutor !== "desenvolvedor") {
      return res.status(403).json({
        erro: "Somente desenvolvedor pode alterar dados de outros usuários.",
      });
    }

    const { id } = req.params;
    const camposPermitidos = [];
    const valores = [];

    const dados = req.body || {};
    if ((dados.municipio !== undefined || dados.unidade !== undefined) && !validLocation(dados.municipio, dados.unidade)) return res.status(400).json({ erro: "Município ou unidade fora da área de atuação." });

    if (dados.email !== undefined && !normalizarEmail(dados.email)) {
      return res.status(400).json({
        erro: "E-mail inválido.",
      });
    }

    if (dados.email !== undefined && await emailJaExiste(dados.email, id)) {
      return res.status(409).json({
        erro: "Já existe outro usuário com este e-mail.",
      });
    }

    function adicionarCampo(nomeColuna, valor) {
      valores.push(valor);
      camposPermitidos.push(`${nomeColuna} = $${valores.length}`);
    }

    if (dados.nome !== undefined) adicionarCampo("nome", normalizarTexto(dados.nome));
    if (dados.email !== undefined) adicionarCampo("email", normalizarEmail(dados.email));
    if (dados.perfil !== undefined) adicionarCampo("perfil", normalizarPerfilUsuario(dados.perfil));
    if (dados.status !== undefined) adicionarCampo("status", normalizarStatusUsuario(dados.status));
    if (dados.telefone !== undefined) adicionarCampo("telefone", normalizarTexto(dados.telefone));
    if (dados.departamento !== undefined) adicionarCampo("departamento", normalizarTexto(dados.departamento));
    if (dados.municipio !== undefined) adicionarCampo("municipio", normalizarTexto(dados.municipio));
    if (dados.unidade !== undefined) adicionarCampo("unidade", normalizarTexto(dados.unidade));
    if (dados.cargo !== undefined) adicionarCampo("cargo", normalizarTexto(dados.cargo));

    if (dados.senha !== undefined && normalizarTexto(dados.senha)) {
      if (!senhaForte(dados.senha)) return res.status(400).json({ erro: "A senha deve ter ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo." });
      const senhaHash = await bcrypt.hash(String(dados.senha), 10);
      adicionarCampo("senha", senhaHash);
      adicionarCampo("tentativas_login", 0);
      adicionarCampo("bloqueado_ate", null);
    }
    if (dados.senha || dados.perfil !== undefined || dados.status !== undefined) camposPermitidos.push("token_version = COALESCE(token_version, 1) + 1");

    if (!camposPermitidos.length) {
      const usuarioAtual = await buscarUsuarioPorId(id, req);

      if (!usuarioAtual) {
        return res.status(404).json({
          erro: "Usuário não encontrado.",
        });
      }

      return res.json(usuarioAtual);
    }

    valores.push(id);

    const result = await pool.query(
      `UPDATE usuarios
       SET ${camposPermitidos.join(", ")}
       WHERE id = $${valores.length}
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      valores
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    await registrarAuditoria(req, id, "atualizado", `Dados do usuário ${result.rows[0].email} atualizados.`);

    return res.json(montarUsuarioPublico(result.rows[0], req));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar usuário",
      detalhe: error.message,
    });
  }
}

async function obterMeuPerfil(req, res) {
  try {
    const usuarioId = usuarioIdDoRequest(req);

    if (!usuarioId) {
      return res.status(401).json({
        erro: "Usuário não autenticado.",
      });
    }

    const usuario = await buscarUsuarioPorId(usuarioId, req);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    return res.json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao obter perfil",
      detalhe: error.message,
    });
  }
}

async function atualizarMeuPerfil(req, res) {
  try {
    const usuarioId = usuarioIdDoRequest(req);

    if (!usuarioId) {
      return res.status(401).json({
        erro: "Usuário não autenticado.",
      });
    }

    const { nome, telefone, departamento, municipio, unidade, cargo } = req.body;
    if ((municipio !== undefined || unidade !== undefined) && !validLocation(municipio, unidade)) return res.status(400).json({ erro: "Município ou unidade fora da área de atuação." });

    const result = await pool.query(
      `UPDATE usuarios
       SET
        nome = COALESCE($1, nome),
        telefone = COALESCE($2, telefone),
        departamento = COALESCE($3, departamento),
        municipio = COALESCE($4, municipio),
        unidade = COALESCE($5, unidade),
        cargo = COALESCE($6, cargo)
       WHERE id = $7
       RETURNING
        id,
        nome,
        email,
        perfil,
        status,
        telefone,
        departamento,
        municipio,
        unidade,
        cargo,
        criado_em,
        aprovado_em,
        aprovado_por,
        ultimo_login_em,
        bloqueado_ate`,
      [
        nome !== undefined ? normalizarTexto(nome) : null,
        telefone !== undefined ? normalizarTexto(telefone) : null,
        departamento !== undefined ? normalizarTexto(departamento) : null,
        municipio !== undefined ? normalizarTexto(municipio) : null,
        unidade !== undefined ? normalizarTexto(unidade) : null,
        cargo !== undefined ? normalizarTexto(cargo) : null,
        usuarioId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    await registrarAuditoria(req, usuarioId, "perfil_atualizado", "Usuário atualizou o próprio perfil.");

    return res.json(montarUsuarioPublico(result.rows[0], req));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar perfil",
      detalhe: error.message,
    });
  }
}

async function atualizarMinhaFotoPerfil(req, res) {
  try {
    const usuarioId = usuarioIdDoRequest(req);

    if (!usuarioId) {
      return res.status(401).json({
        erro: "Usuário não autenticado.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        erro: "Envie uma foto de perfil.",
      });
    }

    limparFotosPerfil(usuarioId, req.file.filename);

    const usuario = await buscarUsuarioPorId(usuarioId, req);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    await registrarAuditoria(req, usuarioId, "foto_atualizada", "Foto de perfil atualizada.");

    return res.json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar foto de perfil",
      detalhe: error.message,
    });
  }
}

async function removerMinhaFotoPerfil(req, res) {
  try {
    const usuarioId = usuarioIdDoRequest(req);

    if (!usuarioId) {
      return res.status(401).json({
        erro: "Usuário não autenticado.",
      });
    }

    limparFotosPerfil(usuarioId);

    const usuario = await buscarUsuarioPorId(usuarioId, req);

    if (!usuario) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    await registrarAuditoria(req, usuarioId, "foto_removida", "Foto de perfil removida.");

    return res.json({
      ...usuario,
      foto_url: "",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao remover foto de perfil",
      detalhe: error.message,
    });
  }
}

async function excluirUsuarioAdmin(req, res) {
  try {
    const perfilAutor = perfilDoRequest(req);

    if (perfilAutor !== "desenvolvedor") {
      return res.status(403).json({
        erro: "Somente desenvolvedor pode excluir usuários.",
      });
    }

    const { id } = req.params;

    if (String(id) === String(usuarioIdDoRequest(req))) {
      return res.status(400).json({
        erro: "Você não pode excluir o próprio usuário logado.",
      });
    }

    const result = await pool.query(
      `DELETE FROM usuarios
       WHERE id = $1
       RETURNING id, email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado.",
      });
    }

    limparFotosPerfil(id);

    await registrarAuditoria(req, id, "excluido", `Usuário ${result.rows[0].email} excluído.`);

    return res.json({
      mensagem: "Usuário excluído com sucesso.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao excluir usuário",
      detalhe: error.message,
    });
  }
}

module.exports = {
  criarPrimeiroAdmin,
  cadastrarUsuarioPublico,
  createUser,
  listarUsuarios,
  aprovarUsuario,
  rejeitarUsuario,
  atualizarUsuarioAdmin,
  obterMeuPerfil,
  atualizarMeuPerfil,
  atualizarMinhaFotoPerfil,
  removerMinhaFotoPerfil,
  excluirUsuarioAdmin,
};
