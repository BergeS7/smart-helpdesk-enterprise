/**
 * SaaS multiempresa — fase 5: registro de cada consulta da plataforma aos dados de uma empresa.
 * A administração da plataforma só visualiza a operação dos clientes, e cada visualização fica
 * registrada (LGPD: quem acessou, quando, de onde e o quê). Tabela da plataforma: só modo sistema.
 */
exports.up = (pgm) => pgm.sql(`
  CREATE TABLE IF NOT EXISTS plataforma_acessos (
    id BIGSERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_email VARCHAR(160) NOT NULL,
    recurso VARCHAR(60) NOT NULL,
    ip VARCHAR(100),
    user_agent VARCHAR(1000),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_plataforma_acessos_empresa ON plataforma_acessos (empresa_id, criado_em DESC);

  -- Mantém a regra de que toda tabela com empresa_id é isolada; as empresas não recebem permissão nela.
  ALTER TABLE plataforma_acessos ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS isolamento_empresa ON plataforma_acessos;
  CREATE POLICY isolamento_empresa ON plataforma_acessos
    USING (empresa_id = NULLIF(current_setting('app.empresa_id', true), '')::integer);
  REVOKE ALL ON plataforma_acessos FROM helpdesk_empresa;
`);

exports.down = (pgm) => pgm.sql("DROP TABLE IF EXISTS plataforma_acessos;");
