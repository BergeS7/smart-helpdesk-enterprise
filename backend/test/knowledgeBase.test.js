/**
 * Responsabilidade: Testes automatizados que verificam a base de conhecimento.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizarArtigo, erroPublicacao } = require("../src/domain/knowledgeBase");

const IMAGEM = "supabase://knowledge-base/artigos/123e4567-e89b-12d3-a456-426614174000.png";

function stub(modulo, exports) {
  const caminho = require.resolve(modulo);
  require.cache[caminho] = { id: caminho, filename: caminho, loaded: true, exports };
}

function loadController(fakePool) {
  stub("../src/config/database", fakePool);
  stub("../src/utils/supabaseStorage", {
    async enviarArquivo() { return IMAGEM; },
    async urlAssinada(ref) { return `https://projeto.supabase.co/assinada/${ref.split("/").pop()}`; },
  });
  for (const modulo of ["../src/controllers/catalogController", "../src/services/permissionService", "../src/controllers/chamados/registro", "../src/utils/profilePhoto"]) {
    delete require.cache[require.resolve(modulo)];
  }
  return require("../src/controllers/catalogController");
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function fakePool({ artigo, statusAtual = "rascunho" } = {}) {
  const queries = [];
  return {
    queries,
    async query(sql, values) {
      queries.push({ sql: String(sql), values });
      if (String(sql).includes("WHERE b.id = $1")) {
        // Simula o filtro de leitura que o SQL aplica no banco real.
        const oculto = artigo && ((String(sql).includes("b.status = 'publicado'") && artigo.status !== "publicado")
          || (String(sql).includes("b.visibilidade = 'publico'") && artigo.visibilidade === "interno"));
        return { rows: artigo && !oculto ? [artigo] : [] };
      }
      if (String(sql).startsWith("SELECT status FROM base_conhecimento")) return { rows: [{ status: statusAtual }] };
      if (String(sql).includes("FROM usuario_permissoes")) return { rows: [], rowCount: 0 };
      if (String(sql).startsWith("INSERT INTO base_conhecimento")) return { rows: [{ id: 1, titulo: values[0], status: "rascunho" }] };
      if (String(sql).includes("UPDATE base_conhecimento")) return { rows: [{ id: 1, titulo: "Impressora", status: "publicado" }] };
      return { rows: [] };
    },
  };
}

test("criação exige título e conteúdo e começa como rascunho", () => {
  assert.deepEqual(normalizarArtigo({ titulo: "Só título" }, { criacao: true }).erros, ["Título e conteúdo são obrigatórios"]);
  const { dados, erros } = normalizarArtigo({ titulo: " Impressora ", conteudo: "Passos", solucao: "" }, { criacao: true });
  assert.deepEqual(erros, []);
  assert.equal(dados.titulo, "Impressora");
  assert.equal(dados.solucao, null);
  assert.equal(dados.status, "rascunho");
  assert.equal(dados.ativo, false);
});

test("atualização parcial altera só os campos enviados e sincroniza ativo com o status", () => {
  assert.deepEqual(normalizarArtigo({ status: "publicado" }).dados, { status: "publicado", ativo: true });
  assert.deepEqual(normalizarArtigo({ status: "revisao" }).dados, { status: "revisao", ativo: false });
  assert.deepEqual(normalizarArtigo({ status: "apagado" }).erros, ["Status do artigo inválido"]);
  assert.deepEqual(normalizarArtigo({ titulo: "" }).erros, ["Título e conteúdo são obrigatórios"]);
});

test("cliente legado que envia apenas ativo continua funcionando", () => {
  assert.equal(normalizarArtigo({ ativo: false }).dados.status, "arquivado");
  assert.equal(normalizarArtigo({ ativo: true }).dados.status, "publicado");
});

test("usuário comum só lista artigos publicados, mesmo pedindo todos", async () => {
  const pool = fakePool();
  const { listarBase } = loadController(pool);
  const res = response();
  await listarBase({ query: { todos: "true" }, user: { id: 7, perfil: "usuario" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(pool.queries.at(-1).sql, /b\.status = 'publicado'/);
});

test("gestor da base lista todos os status quando pede", async () => {
  const pool = fakePool();
  const { listarBase } = loadController(pool);
  await listarBase({ query: { todos: "true" }, user: { id: 1, perfil: "admin" } }, response());
  assert.doesNotMatch(pool.queries.at(-1).sql, /status = 'publicado'/);
});

test("atualização registra autor da alteração e auditoria", async () => {
  const pool = fakePool();
  const { atualizarBase } = loadController(pool);
  const res = response();
  await atualizarBase({ params: { id: "1" }, body: { solucao: "Reiniciar spooler", status: "publicado" }, user: { id: 3, nome: "Ana", perfil: "admin" } }, res);
  assert.equal(res.statusCode, 200);
  const update = pool.queries.find((q) => q.sql.includes("UPDATE base_conhecimento"));
  assert.match(update.sql, /solucao = \$1, status = \$2, ativo = \$3,\s+atualizado_por = \$4/);
  assert.deepEqual(update.values, ["Reiniciar spooler", "publicado", true, 3, "1"]);
  assert.ok(pool.queries.some((q) => q.sql.includes("INSERT INTO auditoria_sistema")));
});

test("passos aceitam só imagens enviadas pelo upload da base", () => {
  const ok = normalizarArtigo({ passos: [{ texto: " Abra o painel ", imagem: IMAGEM }, { texto: "Reinicie" }] });
  assert.deepEqual(ok.erros, []);
  assert.deepEqual(JSON.parse(ok.dados.passos), [{ texto: "Abra o painel", imagem: IMAGEM }, { texto: "Reinicie" }]);
  const outroBucket = "supabase://ticket-attachments/chamados/9/123e4567-e89b-12d3-a456-426614174000.png";
  assert.deepEqual(normalizarArtigo({ passos: [{ texto: "x", imagem: outroBucket }] }).erros, ["Imagem do passo inválida"]);
  assert.deepEqual(normalizarArtigo({ passos: [{ texto: " " }] }).erros, ["Todo passo precisa de uma descrição"]);
  assert.deepEqual(normalizarArtigo({ passos: "passo 1" }).erros, ["O passo a passo deve ser uma lista"]);
});

test("vídeo é só um link https e pode ser removido", () => {
  assert.equal(normalizarArtigo({ video_url: "https://www.youtube.com/watch?v=abc" }).dados.video_url, "https://www.youtube.com/watch?v=abc");
  assert.equal(normalizarArtigo({ video_url: "" }).dados.video_url, null);
  for (const invalido of ["http://site.com/v.mp4", "javascript:alert(1)", "não é url"]) {
    assert.deepEqual(normalizarArtigo({ video_url: invalido }).erros, ["Informe um link de vídeo válido começando com https://"]);
  }
});

test("rascunho não abre para usuário comum", async () => {
  const { obterBase } = loadController(fakePool({ artigo: { id: 5, status: "rascunho", passos: [] } }));
  const res = response();
  await obterBase({ params: { id: "5" }, user: { id: 7, perfil: "usuario" } }, res);
  assert.equal(res.statusCode, 404);
});

test("artigo publicado abre com URLs temporárias só para os passos com imagem", async () => {
  const artigo = { id: 5, status: "publicado", passos: [{ texto: "Abra", imagem: IMAGEM }, { texto: "Feche" }] };
  const { obterBase } = loadController(fakePool({ artigo }));
  const res = response();
  await obterBase({ params: { id: "5" }, user: { id: 7, perfil: "usuario" } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.passos[0].imagem_url, /^https:\/\/projeto\.supabase\.co\//);
  assert.equal("imagem_url" in res.body.passos[1], false);
});

test("upload recusa arquivo que só finge ser imagem", async () => {
  const { enviarImagemBase } = loadController(fakePool());
  const res = response();
  await enviarImagemBase({ file: { mimetype: "image/png", buffer: Buffer.from("<script>") }, user: { id: 1, perfil: "admin" } }, res);
  assert.equal(res.statusCode, 400);

  const png = Buffer.from("89504e470d0a1a0a0000", "hex");
  const ok = response();
  await enviarImagemBase({ file: { mimetype: "image/png", buffer: png }, user: { id: 1, perfil: "admin" } }, ok);
  assert.equal(ok.statusCode, 201);
  assert.equal(ok.body.imagem, IMAGEM);
});

test("técnico trabalha com rascunho e revisão; supervisor publica e arquiva", () => {
  assert.equal(erroPublicacao("tecnico", { novoStatus: "revisao" }), null);
  assert.equal(erroPublicacao("tecnico", { statusAtual: "revisao", novoStatus: "rascunho" }), null);
  assert.match(erroPublicacao("tecnico", { novoStatus: "publicado" }), /Envie o artigo para revisão/);
  assert.match(erroPublicacao("tecnico", { statusAtual: "publicado" }), /alteram artigos publicados/);
  for (const perfil of ["supervisor", "admin", "desenvolvedor", "super_admin"]) {
    assert.equal(erroPublicacao(perfil, { statusAtual: "publicado", novoStatus: "arquivado" }), null);
  }
});

test("visibilidade aceita apenas público ou interno", () => {
  assert.equal(normalizarArtigo({ visibilidade: "interno" }).dados.visibilidade, "interno");
  assert.deepEqual(normalizarArtigo({ visibilidade: "secreto" }).erros, ["Visibilidade do artigo inválida"]);
});

test("técnico não publica ao criar, mas envia para revisão", async () => {
  const { criarBase } = loadController(fakePool());
  const tecnico = { id: 4, nome: "Téc", perfil: "tecnico" };
  const bloqueado = response();
  await criarBase({ body: { titulo: "Wi-Fi", conteudo: "x", status: "publicado" }, user: tecnico }, bloqueado);
  assert.equal(bloqueado.statusCode, 403);
  const legado = response();
  await criarBase({ body: { titulo: "Wi-Fi", conteudo: "x", ativo: true }, user: tecnico }, legado);
  assert.equal(legado.statusCode, 403);
  const revisao = response();
  await criarBase({ body: { titulo: "Wi-Fi", conteudo: "x", status: "revisao" }, user: tecnico }, revisao);
  assert.equal(revisao.statusCode, 201);
});

test("técnico não altera artigo já publicado", async () => {
  const pool = fakePool({ statusAtual: "publicado" });
  const { atualizarBase } = loadController(pool);
  const res = response();
  await atualizarBase({ params: { id: "1" }, body: { solucao: "nova" }, user: { id: 4, perfil: "tecnico" } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(pool.queries.some((q) => q.sql.includes("UPDATE base_conhecimento")), false);
});

test("usuário comum não vê artigos internos; a equipe técnica vê", async () => {
  const usuario = fakePool();
  await loadController(usuario).listarBase({ query: {}, user: { id: 7, perfil: "usuario" } }, response());
  assert.match(usuario.queries.at(-1).sql, /b\.status = 'publicado' AND b\.visibilidade = 'publico'/);

  const tecnico = fakePool();
  await loadController(tecnico).listarBase({ query: {}, user: { id: 4, perfil: "tecnico" } }, response());
  assert.doesNotMatch(tecnico.queries.at(-1).sql, /visibilidade = 'publico'/);

  const interno = { id: 9, status: "publicado", visibilidade: "interno", passos: [] };
  const paraUsuario = response();
  await loadController(fakePool({ artigo: interno })).obterBase({ params: { id: "9" }, user: { id: 7, perfil: "usuario" } }, paraUsuario);
  assert.equal(paraUsuario.statusCode, 404);
  const paraTecnico = response();
  await loadController(fakePool({ artigo: interno })).obterBase({ params: { id: "9" }, user: { id: 4, perfil: "tecnico" } }, paraTecnico);
  assert.equal(paraTecnico.statusCode, 200);
});
