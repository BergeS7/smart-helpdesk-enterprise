const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { obterSupabase } = require("../config/supabase");
const { garantirBucket } = require("./supabaseStorage");

const pastaPerfis = path.join(__dirname, "../../uploads/perfis");
const bucketAvatares = "avatars";
// A sessão padrão dura 8 horas. A URL precisa continuar válida durante toda a
// sessão, inclusive nas telas administrativas que mantêm o perfil em cache.
const duracaoUrlAssinada = 12 * 60 * 60;
const extensoesPorMime = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

function montarUrlFotoPerfilLegada(req, usuarioId) {
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

function caminhoAvatarPertenceAoUsuario(caminho, usuarioId) {
  const idSeguro = String(usuarioId || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const padrao = new RegExp(
    `^usuarios/${idSeguro}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
    "i"
  );
  return Boolean(idSeguro) && padrao.test(String(caminho || ""));
}

function arquivoTemAssinaturaValida(arquivo) {
  const buffer = arquivo?.buffer;
  if (!Buffer.isBuffer(buffer)) return false;

  if (arquivo.mimetype === "image/jpeg") {
    return buffer.length >= 3 && buffer.subarray(0, 3).toString("hex") === "ffd8ff";
  }
  if (arquivo.mimetype === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  }
  if (arquivo.mimetype === "image/webp") {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

async function gerarUrlAvatar(caminho) {
  if (!caminho) return "";

  await garantirBucket(bucketAvatares, false);

  const { data, error } = await obterSupabase()
    .storage
    .from(bucketAvatares)
    .createSignedUrl(caminho, duracaoUrlAssinada);

  if (error) throw error;
  return data?.signedUrl || "";
}

async function montarUrlFotoPerfil(req, usuarioId, caminho = "") {
  if (!caminho) return montarUrlFotoPerfilLegada(req, usuarioId);

  try {
    return await gerarUrlAvatar(caminho);
  } catch (error) {
    console.error("Erro ao gerar URL assinada do avatar:", error.message);
    return "";
  }
}

async function enviarAvatar(usuarioId, arquivo) {
  const extensao = extensoesPorMime[arquivo?.mimetype];
  if (!usuarioId || !arquivo?.buffer || !extensao) {
    throw new Error("Arquivo de avatar inválido.");
  }

  const caminho = `usuarios/${usuarioId}/${crypto.randomUUID()}.${extensao}`;
  await garantirBucket(bucketAvatares, false);
  const { error } = await obterSupabase()
    .storage
    .from(bucketAvatares)
    .upload(caminho, arquivo.buffer, {
      contentType: arquivo.mimetype,
      upsert: false,
    });

  if (error) throw error;
  return caminho;
}

async function removerAvatar(usuarioId, caminho) {
  if (!caminho) return;
  if (!caminhoAvatarPertenceAoUsuario(caminho, usuarioId)) {
    throw new Error("Caminho de avatar inválido.");
  }

  const { error } = await obterSupabase()
    .storage
    .from(bucketAvatares)
    .remove([caminho]);

  if (error) throw error;
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
  montarUrlFotoPerfilLegada,
  limparFotosPerfil,
  gerarUrlAvatar,
  enviarAvatar,
  removerAvatar,
  caminhoAvatarPertenceAoUsuario,
  arquivoTemAssinaturaValida,
};
