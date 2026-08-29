/**
 * Responsabilidade: Testes automatizados que verificam profile photo.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const uploadFotoPerfil = require("../src/middlewares/profilePhotoUploadMiddleware");
const {
  arquivoTemAssinaturaValida,
  caminhoAvatarPertenceAoUsuario,
} = require("../src/utils/profilePhoto");

const arquivo = (mimetype, bytes) => ({ mimetype, buffer: Buffer.from(bytes) });

test("aceita somente os MIME types de avatar configurados", () => {
  assert.deepEqual(
    [...uploadFotoPerfil.tiposPermitidos].sort(),
    ["image/jpeg", "image/png", "image/webp"].sort()
  );
  for (const tipo of ["application/pdf", "text/plain", "application/x-msdownload", "image/svg+xml"]) {
    assert.equal(uploadFotoPerfil.tiposPermitidos.has(tipo), false);
  }
});

test("limita a foto de perfil a 5 MB", () => {
  assert.equal(uploadFotoPerfil.limiteFotoPerfilBytes, 5 * 1024 * 1024);
});

test("valida as assinaturas reais de JPG, PNG e WEBP", () => {
  assert.equal(arquivoTemAssinaturaValida(arquivo("image/jpeg", [0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(arquivoTemAssinaturaValida(arquivo("image/png", [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), true);
  assert.equal(arquivoTemAssinaturaValida(arquivo("image/webp", Buffer.from("RIFF0000WEBP"))), true);
  assert.equal(arquivoTemAssinaturaValida(arquivo("image/jpeg", Buffer.from("%PDF-"))), false);
  assert.equal(arquivoTemAssinaturaValida(arquivo("image/png", Buffer.from("texto"))), false);
});

test("aceita apenas paths aleatórios pertencentes ao usuário", () => {
  const valido = "usuarios/123/550e8400-e29b-41d4-a716-446655440000.webp";
  assert.equal(caminhoAvatarPertenceAoUsuario(valido, 123), true);
  assert.equal(caminhoAvatarPertenceAoUsuario(valido, 456), false);
  assert.equal(caminhoAvatarPertenceAoUsuario("usuarios/123/../456/avatar.webp", 123), false);
  assert.equal(caminhoAvatarPertenceAoUsuario("usuarios/123/avatar.webp", 123), false);
});
