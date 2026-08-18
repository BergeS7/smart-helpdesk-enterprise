CREATE DATABASE smart_helpdesk;

\c smart_helpdesk;

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'usuario',
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  telefone VARCHAR(30),
  departamento VARCHAR(100),
  cargo VARCHAR(100),
  aprovado_em TIMESTAMP,
  aprovado_por INTEGER,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamados (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT NOT NULL,
  prioridade VARCHAR(20) NOT NULL DEFAULT 'Media',
  prioridade_ia_motivo TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_USER','WAITING_THIRD_PARTY','RESOLVED','CLOSED','CANCELED','REOPENED')),
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  solicitante VARCHAR(120),
  email_solicitante VARCHAR(160),
  telefone_solicitante VARCHAR(30),
  cargo_solicitante VARCHAR(100),
  setor VARCHAR(80),
  responsavel VARCHAR(120),
  sla VARCHAR(80),
  reaberto_em TIMESTAMP,
  finalizado_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower ON usuarios (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios (perfil);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios (status);
CREATE INDEX IF NOT EXISTS idx_chamados_email_solicitante ON chamados (LOWER(email_solicitante));
CREATE INDEX IF NOT EXISTS idx_chamados_usuario_id ON chamados (usuario_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados (status);
CREATE INDEX IF NOT EXISTS idx_chamado_movimentacoes_chamado ON chamado_movimentacoes (chamado_id);
CREATE INDEX IF NOT EXISTS idx_chamado_comentarios_chamado ON chamado_comentarios (chamado_id);
CREATE INDEX IF NOT EXISTS idx_chamado_anexos_chamado ON chamado_anexos (chamado_id);
