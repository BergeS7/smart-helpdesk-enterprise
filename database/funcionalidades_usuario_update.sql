-- Responsabilidade: Estrutura ou migração de banco relacionada a funcionalidades usuario update.
-- Smart HelpDesk — funcionalidades do portal do usuário e chamados
-- Execute este arquivo no banco smart_helpdesk.

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS perfil VARCHAR(20) NOT NULL DEFAULT 'usuario';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativo';

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS departamento VARCHAR(100);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS aprovado_por INTEGER;

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS prioridade_ia_motivo TEXT;

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS email_solicitante VARCHAR(160);

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS telefone_solicitante VARCHAR(30);

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS cargo_solicitante VARCHAR(100);

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS reaberto_em TIMESTAMP;

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP;

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS responsavel VARCHAR(120);

ALTER TABLE chamados
ADD COLUMN IF NOT EXISTS sla VARCHAR(80);

UPDATE usuarios
SET perfil = 'usuario'
WHERE perfil IS NULL OR perfil NOT IN ('usuario', 'admin');

UPDATE usuarios
SET status = 'ativo'
WHERE status IS NULL OR status NOT IN ('pendente', 'ativo', 'rejeitado', 'inativo');

UPDATE chamados
SET email_solicitante = LOWER(COALESCE(email_solicitante, 'sem-email@local.com'))
WHERE email_solicitante IS NULL;

UPDATE chamados
SET prioridade_ia_motivo = COALESCE(prioridade_ia_motivo, 'Chamado antigo sem análise de IA')
WHERE prioridade_ia_motivo IS NULL;

CREATE TABLE IF NOT EXISTS chamado_movimentacoes (
  id SERIAL PRIMARY KEY,
  chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nome VARCHAR(120),
  autor_perfil VARCHAR(20),
  tipo VARCHAR(60) NOT NULL,
  descricao TEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamado_comentarios (
  id SERIAL PRIMARY KEY,
  chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nome VARCHAR(120),
  autor_perfil VARCHAR(20),
  mensagem TEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamado_anexos (
  id SERIAL PRIMARY KEY,
  chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120),
  tamanho INTEGER,
  caminho TEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamado_avaliacoes (
  id SERIAL PRIMARY KEY,
  chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (chamado_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower
  ON usuarios (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil
  ON usuarios (perfil);

CREATE INDEX IF NOT EXISTS idx_usuarios_status
  ON usuarios (status);

CREATE INDEX IF NOT EXISTS idx_chamados_email_solicitante
  ON chamados (LOWER(email_solicitante));

CREATE INDEX IF NOT EXISTS idx_chamados_usuario_id
  ON chamados (usuario_id);

CREATE INDEX IF NOT EXISTS idx_chamados_status
  ON chamados (status);

CREATE INDEX IF NOT EXISTS idx_chamado_movimentacoes_chamado
  ON chamado_movimentacoes (chamado_id);

CREATE INDEX IF NOT EXISTS idx_chamado_comentarios_chamado
  ON chamado_comentarios (chamado_id);

CREATE INDEX IF NOT EXISTS idx_chamado_anexos_chamado
  ON chamado_anexos (chamado_id);
