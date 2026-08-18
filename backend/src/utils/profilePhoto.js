const fs = require("fs");
const path = require("path");

const pastaPerfis = path.join(__dirname, "../../uploads/perfis");

function garantirPastaPerfis() {
  if (!fs.existsSync(pastaPerfis)) {
    fs.mkdirSync(pastaPerfis, { recursive: true });
  }
}

function nomeBasePerfil(usuarioId) {
  return `perfil-${usuarioId}-`;
}

function listarFotosPerfil(usuarioId) {
  garantirPastaPerfis();

  if (!usuarioId) {
    return [];
  }

  const prefixo = nomeBasePerfil(usuarioId);

  return fs
    .readdirSync(pastaPerfis)
    .filter((arquivo) => arquivo.startsWith(prefixo))
    .map((arquivo) => {
      const caminho = path.join(pastaPerfis, arquivo);
      const stat = fs.statSync(caminho);

      return {
        arquivo,
        caminho,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function montarBaseUrl(req) {
  if (!req) {
    return "http://localhost:3001";
  }

  const protocolo = req.protocol || "http";
  const host = req.get ? req.get("host") : "localhost:3001";

  return `${protocolo}://${host}`;
}

function montarUrlFotoPerfil(req, usuarioId) {
  if (!usuarioId) {
    return "";
  }

  const fotos = listarFotosPerfil(usuarioId);

  if (!fotos.length) {
    return "";
  }

  const fotoMaisRecente = fotos[0];
  const baseUrl = montarBaseUrl(req);

  return `${baseUrl}/uploads/perfis/${fotoMaisRecente.arquivo}?v=${Math.round(fotoMaisRecente.mtimeMs)}`;
}

function limparFotosPerfil(usuarioId, manterArquivo = "") {
  if (!usuarioId) {
    return;
  }

  const fotos = listarFotosPerfil(usuarioId);

  fotos.forEach((foto) => {
    if (manterArquivo && foto.arquivo === manterArquivo) {
      return;
    }

    try {
      fs.unlinkSync(foto.caminho);
    } catch {
      // Ignora erro ao remover arquivo antigo.
    }
  });
}

module.exports = {
  pastaPerfis,
  garantirPastaPerfis,
  listarFotosPerfil,
  montarUrlFotoPerfil,
  limparFotosPerfil,
};
