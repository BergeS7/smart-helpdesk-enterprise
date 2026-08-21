-- Smart HelpDesk - atualização empresarial completa
-- Execute no banco smart_helpdesk:
-- & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d smart_helpdesk -f database\helpdesk_empresarial_update.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(30) NOT NULL DEFAULT 'usuario';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ativo';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS departamento VARCHAR(120);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS municipio VARCHAR(150);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade VARCHAR(180);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS municipio_solicitante VARCHAR(150);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS unidade_solicitante VARCHAR(180);
CREATE INDEX IF NOT EXISTS idx_chamados_municipio_criado ON chamados(municipio_solicitante, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_unidade_criado ON chamados(unidade_solicitante, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_team_criado ON chamados(team_id, criado_em DESC);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(120);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aprovado_por INTEGER;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tentativas_login INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login_em TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_expira_em TIMESTAMP;

UPDATE usuarios SET perfil = 'usuario' WHERE perfil IS NULL OR perfil NOT IN ('usuario','tecnico','admin','desenvolvedor');
UPDATE usuarios SET status = 'ativo' WHERE status IS NULL OR status NOT IN ('pendente','ativo','rejeitado','inativo');

CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipos_chamado (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS base_conhecimento (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  categoria VARCHAR(120),
  palavras_chave TEXT,
  conteudo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'info',
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  link VARCHAR(255),
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_sistema (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nome VARCHAR(160),
  autor_perfil VARCHAR(40),
  entidade VARCHAR(80) NOT NULL,
  entidade_id INTEGER,
  acao VARCHAR(120) NOT NULL,
  descricao TEXT,
  dados JSONB,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE chamados ADD COLUMN IF NOT EXISTS numero_chamado VARCHAR(30);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS tipo_chamado VARCHAR(120);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS categoria_ia VARCHAR(120);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_ia VARCHAR(30);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_ia_confianca NUMERIC(5,2);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_ia_analise JSONB;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_manual_motivo TEXT;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_alterada_por INTEGER;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_alterada_em TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS responsavel VARCHAR(160);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ia_responsavel_sugerido VARCHAR(160);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ia_resposta_inicial TEXT;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ia_duplicado_de INTEGER REFERENCES chamados(id) ON DELETE SET NULL;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS ia_duplicidade_motivo TEXT;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_resposta_minutos INTEGER;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_resolucao_minutos INTEGER;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_limite_resposta TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_limite_resolucao TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS primeira_resposta_em TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS vencido BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS reaberto_em TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS telefone_solicitante VARCHAR(30);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS cargo_solicitante VARCHAR(120);
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- Gera número único para chamados antigos, se ainda não existir
UPDATE chamados
SET numero_chamado = '#HD-' || TO_CHAR(COALESCE(criado_em, CURRENT_TIMESTAMP), 'YYYY') || '-' || LPAD(id::text, 4, '0')
WHERE numero_chamado IS NULL;

UPDATE chamados SET prioridade_ia = COALESCE(prioridade_ia, prioridade, 'Media') WHERE prioridade_ia IS NULL;
UPDATE chamados SET tipo_chamado = COALESCE(tipo_chamado, 'Incidente') WHERE tipo_chamado IS NULL;
UPDATE chamados SET categoria_ia = COALESCE(categoria_ia, 'Não classificado') WHERE categoria_ia IS NULL;
UPDATE chamados SET sla_resposta_minutos = COALESCE(sla_resposta_minutos, CASE WHEN prioridade = 'Alta' THEN 60 WHEN prioridade = 'Baixa' THEN 1440 ELSE 240 END) WHERE sla_resposta_minutos IS NULL;
UPDATE chamados SET sla_resolucao_minutos = COALESCE(sla_resolucao_minutos, CASE WHEN prioridade = 'Alta' THEN 480 WHEN prioridade = 'Baixa' THEN 2880 ELSE 1440 END) WHERE sla_resolucao_minutos IS NULL;
UPDATE chamados SET sla_limite_resposta = COALESCE(sla_limite_resposta, COALESCE(criado_em, CURRENT_TIMESTAMP) + (sla_resposta_minutos || ' minutes')::interval) WHERE sla_limite_resposta IS NULL;
UPDATE chamados SET sla_limite_resolucao = COALESCE(sla_limite_resolucao, COALESCE(criado_em, CURRENT_TIMESTAMP) + (sla_resolucao_minutos || ' minutes')::interval) WHERE sla_limite_resolucao IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chamados_numero_chamado ON chamados(numero_chamado);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_prioridade ON chamados(prioridade);
CREATE INDEX IF NOT EXISTS idx_chamados_setor ON chamados(setor);
CREATE INDEX IF NOT EXISTS idx_chamados_responsavel_id ON chamados(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_status ON usuarios(perfil, status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);

-- Catálogos e artigos começam vazios e devem ser cadastrados pelo desenvolvedor.
