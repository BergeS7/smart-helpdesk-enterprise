/**
 * Responsabilidade: garante que a empresa da requisição sobrevive ao upload (multer) antes do controlador.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const multer = require("multer");
const { executarComoEmpresa, empresaAtual } = require("../src/config/tenantContext");
const { manterEmpresa } = require("../src/middlewares/authMiddleware");

// Simula o authMiddleware: a requisição segue dentro da empresa do usuário.
function autenticado(req, res, next) {
  req.user = { id: 1, empresaId: 7 };
  executarComoEmpresa(7, next);
}

async function empresaNoControlador(...intermediarios) {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/anexos", autenticado, upload.array("arquivos"), ...intermediarios, (req, res) => res.json({ empresa: empresaAtual() }));
  const server = app.listen(0);
  try {
    const form = new FormData();
    form.append("arquivos", new Blob(["conteudo"]), "a.txt");
    const resposta = await fetch(`http://127.0.0.1:${server.address().port}/anexos`, { method: "POST", body: form });
    return (await resposta.json()).empresa;
  } finally {
    server.close();
  }
}

test("upload com manterEmpresa mantém a empresa do usuário no controlador", async () => {
  assert.equal(await empresaNoControlador(manterEmpresa), 7);
});

test("sem manterEmpresa o multer perde a empresa (por isso as rotas de upload o usam)", async () => {
  assert.equal(await empresaNoControlador(), null);
});
