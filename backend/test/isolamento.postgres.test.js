/**
 * Responsabilidade: prova, contra um PostgreSQL real, que a RLS isola os dados de cada empresa.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Exclusivamente um banco descartável com as migrations aplicadas; os dados criados são apagados no fim.
test("PostgreSQL: cada empresa só vê e só altera os próprios dados", {
  skip: !process.env.ISOLAMENTO_TEST_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ISOLAMENTO_TEST_DATABASE_URL;
  delete require.cache[require.resolve("../src/config/database")];
  const pool = require("../src/config/database");
  const { executarComoEmpresa, executarComoSistema } = require("../src/config/tenantContext");
  const sufixo = Date.now();
  const ids = {};

  try {
    await executarComoSistema(async () => {
      for (const nome of ["a", "b"]) {
        ids[nome] = (await pool.query("INSERT INTO empresas (nome, slug) VALUES ($1, $2) RETURNING id", [`Empresa ${nome}`, `iso-${nome}-${sufixo}`])).rows[0].id;
        ids[`u${nome}`] = (await pool.query(
          "INSERT INTO usuarios (nome, email, senha, perfil, status, empresa_id) VALUES ($1, $2, 'x', 'admin', 'ativo', $3) RETURNING id",
          [`Admin ${nome}`, `iso-${nome}-${sufixo}@teste.local`, ids[nome]]
        )).rows[0].id;
      }
    });

    const comoA = (fn) => executarComoEmpresa(ids.a, fn);
    const comoB = (fn) => executarComoEmpresa(ids.b, fn);

    // Sem informar empresa_id: o banco grava a empresa do contexto.
    ids.chamadoA = await comoA(async () => (await pool.query(
      "INSERT INTO chamados (titulo, descricao, usuario_id) VALUES ('Chamado A', 'x', $1) RETURNING id, empresa_id", [ids.ua]
    )).rows[0]);
    ids.chamadoB = await comoB(async () => (await pool.query(
      "INSERT INTO chamados (titulo, descricao, usuario_id) VALUES ('Chamado B', 'x', $1) RETURNING id, empresa_id", [ids.ub]
    )).rows[0]);
    assert.equal(ids.chamadoA.empresa_id, ids.a);
    assert.equal(ids.chamadoB.empresa_id, ids.b);

    await comoA(async () => {
      const chamados = (await pool.query("SELECT id FROM chamados WHERE id = ANY($1)", [[ids.chamadoA.id, ids.chamadoB.id]])).rows.map((r) => r.id);
      assert.deepEqual(chamados, [ids.chamadoA.id], "A não pode ver o chamado de B");
      const usuarios = (await pool.query("SELECT id FROM usuarios WHERE id = ANY($1)", [[ids.ua, ids.ub]])).rows.map((r) => r.id);
      assert.deepEqual(usuarios, [ids.ua], "A não pode ver o usuário de B");
      const alterados = await pool.query("UPDATE chamados SET titulo = 'invadido' WHERE id = $1", [ids.chamadoB.id]);
      assert.equal(alterados.rowCount, 0, "A não pode alterar o chamado de B");
      const apagados = await pool.query("DELETE FROM usuarios WHERE id = $1", [ids.ub]);
      assert.equal(apagados.rowCount, 0, "A não pode apagar o usuário de B");
      await assert.rejects(
        pool.query("INSERT INTO chamados (titulo, descricao, usuario_id, empresa_id) VALUES ('forjado', 'x', $1, $2)", [ids.ua, ids.b]),
        /row-level security/, "A não pode gravar dados em nome de B"
      );
      const empresas = (await pool.query("SELECT id FROM empresas WHERE id = ANY($1)", [[ids.a, ids.b]])).rows.map((r) => r.id);
      assert.deepEqual(empresas, [ids.a], "A só enxerga o próprio cadastro de empresa");
    });

    // Nomes únicos passam a valer dentro de cada empresa.
    for (const [como, usuario] of [[comoA, ids.ua], [comoB, ids.ub]]) {
      await como(async () => {
        await pool.query("INSERT INTO configuracoes_sistema (chave, valor, atualizado_por) VALUES ('nome_sistema', 'Minha empresa', $1)", [usuario]);
        await pool.query("INSERT INTO teams (name) VALUES ($1)", [`Suporte ${sufixo}`]);
      });
    }
    await comoA(async () => {
      await assert.rejects(pool.query("INSERT INTO teams (name) VALUES ($1)", [`Suporte ${sufixo}`]), /uq_teams_empresa/);
    });

    // Fora de uma requisição (agente, link de e-mail, rotina), o registro filho herda a empresa do pai.
    await executarComoSistema(async () => {
      const comentario = await pool.query(
        "INSERT INTO chamado_comentarios (chamado_id, usuario_id, mensagem) VALUES ($1, $2, 'via rotina') RETURNING empresa_id",
        [ids.chamadoB.id, ids.ub]
      );
      assert.equal(comentario.rows[0].empresa_id, ids.b);
      await assert.rejects(
        pool.query("INSERT INTO usuarios (nome, email, senha) VALUES ('sem empresa', $1, 'x')", [`sem-${sufixo}@teste.local`]),
        /empresa_id/, "cadastro sem empresa definida deve falhar em vez de cair numa empresa qualquer"
      );
    });

    const view = await executarComoSistema(() => pool.query("SELECT reloptions FROM pg_class WHERE relname = 'chamado_avaliacoes'"));
    assert.ok(String(view.rows[0]?.reloptions || "").includes("security_invoker=true"), "a view de avaliações precisa respeitar a RLS de quem consulta");
  } finally {
    await executarComoSistema(async () => {
      const empresas = [ids.a, ids.b].filter(Boolean);
      for (const tabela of ["chamado_comentarios", "configuracoes_sistema", "teams", "chamados", "usuarios"]) {
        await pool.query(`DELETE FROM ${tabela} WHERE empresa_id = ANY($1)`, [empresas]);
      }
      await pool.query("DELETE FROM empresas WHERE id = ANY($1)", [empresas]);
    });
    await pool.end();
  }
});

test("PostgreSQL: toda tabela com empresa_id tem RLS ligada e a política de isolamento", {
  skip: !process.env.ISOLAMENTO_TEST_DATABASE_URL,
}, async () => {
  const { Client } = require("pg");
  const client = new Client({ connectionString: process.env.ISOLAMENTO_TEST_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT c.relname
        FROM pg_class c
        JOIN information_schema.columns col ON col.table_name = c.relname AND col.table_schema = 'public' AND col.column_name = 'empresa_id'
       WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
         AND (NOT c.relrowsecurity OR NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = c.relname AND p.policyname = 'isolamento_empresa'))
       ORDER BY 1`);
    assert.deepEqual(rows.map((r) => r.relname), [], "tabelas com dados de empresa sem isolamento");
  } finally {
    await client.end();
  }
});
