const crypto = require("crypto");
const path = require("path");
const { obterSupabase } = require("../config/supabase");

const prefixo = "supabase://";
const bucketsPreparados = new Set();

function referencia(bucket, caminho) {
  return `${prefixo}${bucket}/${caminho}`;
}

function lerReferencia(valor) {
  const texto = String(valor || "");
  if (!texto.startsWith(prefixo)) return null;
  const restante = texto.slice(prefixo.length);
  const separador = restante.indexOf("/");
  if (separador < 1) return null;
  return { bucket: restante.slice(0, separador), caminho: restante.slice(separador + 1) };
}

async function garantirBucket(bucket, publico = false) {
  const chave = `${bucket}:${publico}`;
  if (bucketsPreparados.has(chave)) return;
  const supabase = obterSupabase();
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error && !["404", "400"].includes(String(error.statusCode || error.status || ""))) throw error;
  if (!data) {
    const criado = await supabase.storage.createBucket(bucket, { public: publico });
    if (criado.error && String(criado.error.statusCode || criado.error.status) !== "409") throw criado.error;
  } else if (Boolean(data.public) !== Boolean(publico)) {
    // getPublicUrl apenas monta a URL: ele não torna público um bucket privado
    // criado por uma implantação anterior.
    const atualizado = await supabase.storage.updateBucket(bucket, { public: publico });
    if (atualizado.error) throw atualizado.error;
  }
  bucketsPreparados.add(chave);
}

function extensaoSegura(arquivo) {
  const porMime = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "application/pdf": ".pdf", "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/plain": ".txt",
  };
  return porMime[arquivo?.mimetype] || path.extname(arquivo?.originalname || "").toLowerCase().slice(0, 10);
}

async function enviarArquivo({ bucket, pasta, arquivo, publico = false }) {
  await garantirBucket(bucket, publico);
  const caminho = `${String(pasta).replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}${extensaoSegura(arquivo)}`;
  const { error } = await obterSupabase().storage.from(bucket).upload(caminho, arquivo.buffer, {
    contentType: arquivo.mimetype,
    upsert: false,
  });
  if (error) throw error;
  return referencia(bucket, caminho);
}

async function removerArquivo(valor) {
  const ref = lerReferencia(valor);
  if (!ref) return;
  const { error } = await obterSupabase().storage.from(ref.bucket).remove([ref.caminho]);
  if (error) throw error;
}

async function baixarArquivo(valor) {
  const ref = lerReferencia(valor);
  if (!ref) return null;
  const { data, error } = await obterSupabase().storage.from(ref.bucket).download(ref.caminho);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

function urlPublica(valor) {
  const ref = lerReferencia(valor);
  if (!ref) return String(valor || "");
  return obterSupabase().storage.from(ref.bucket).getPublicUrl(ref.caminho).data.publicUrl;
}

module.exports = { garantirBucket, enviarArquivo, removerArquivo, baixarArquivo, urlPublica, lerReferencia };
