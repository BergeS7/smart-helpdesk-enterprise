-- Responsabilidade: Estrutura ou migração de banco relacionada a smart helpdesk full features update.
-- Smart HelpDesk — pacote completo de melhorias funcionais
-- Execute no banco smart_helpdesk depois das atualizações anteriores.
-- Windows exemplo:
-- & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d smart_helpdesk -f database\smart_helpdesk_full_features_update.sql

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id INTEGER;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS disponivel_atendimento BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Empresas começam vazias e devem ser cadastradas com dados reais.

ALTER TABLE chamados ADD COLUMN IF NOT EXISTS empresa_id INTEGER;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_alerta_enviado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS sla_escalado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_manual_motivo TEXT;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_alterada_por INTEGER;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS prioridade_alterada_em TIMESTAMP;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE chamados ADD COLUMN IF NOT EXISTS vencido BOOLEAN NOT NULL DEFAULT FALSE;

-- Padroniza novos status, sem remover os antigos.
UPDATE chamados SET status = 'CLOSED' WHERE status IN ('Resolvido', 'Concluido', 'Concluído');

CREATE TABLE IF NOT EXISTS respostas_rapidas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(140) NOT NULL,
  mensagem TEXT NOT NULL,
  categoria VARCHAR(100),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Respostas rápidas começam vazias e devem ser cadastradas pela equipe.

CREATE TABLE IF NOT EXISTS filtros_salvos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  chave VARCHAR(120) PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracoes_sistema (chave, valor)
VALUES
('nome_sistema', 'Smart HelpDesk'),
('email_suporte', ''),
('cor_principal', '#2563eb'),
('sla_alta_resposta', '60'),
('sla_alta_resolucao', '480'),
('sla_media_resposta', '240'),
('sla_media_resolucao', '1440'),
('sla_baixa_resposta', '1440'),
('sla_baixa_resolucao', '2880')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE base_conhecimento ADD COLUMN IF NOT EXISTS visualizacoes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE base_conhecimento ADD COLUMN IF NOT EXISTS util_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE base_conhecimento ADD COLUMN IF NOT EXISTS nao_util_total INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_chamados_empresa ON chamados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_chamados_sla ON chamados(sla_limite_resolucao, sla_alerta_enviado, sla_escalado);
CREATE INDEX IF NOT EXISTS idx_chamados_sem_responsavel ON chamados(responsavel_id) WHERE responsavel_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_filtros_salvos_usuario ON filtros_salvos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_respostas_rapidas_ativo ON respostas_rapidas(ativo);
CREATE INDEX IF NOT EXISTS idx_base_conhecimento_views ON base_conhecimento(visualizacoes DESC);

-- Configurações visuais e funcionais globais do sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  chave VARCHAR(120) PRIMARY KEY,
  valor TEXT NOT NULL,
  atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracoes_sistema (chave, valor)
VALUES
('nome_sistema', 'Smart HelpDesk'),
('email_suporte', ''),
('cor_principal', '#2563eb'),
('logo_url', ''),
('sla_alta_resposta', '60'),
('sla_alta_resolucao', '480'),
('sla_media_resposta', '240'),
('sla_media_resolucao', '1440'),
('sla_baixa_resposta', '1440'),
('sla_baixa_resolucao', '2880')
ON CONFLICT (chave) DO NOTHING;
