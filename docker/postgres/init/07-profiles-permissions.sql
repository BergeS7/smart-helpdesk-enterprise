-- Responsabilidade: Configuração de infraestrutura de 07 profiles permissions.
-- Atualização de perfis e permissões do Smart HelpDesk
-- Perfis oficiais: usuario, tecnico, admin, desenvolvedor

ALTER TABLE usuarios
  ALTER COLUMN perfil TYPE VARCHAR(30);

UPDATE usuarios
SET perfil = 'desenvolvedor'
WHERE perfil = 'super_admin';

UPDATE usuarios
SET perfil = 'usuario'
WHERE perfil IS NULL OR perfil NOT IN ('usuario', 'tecnico', 'admin', 'desenvolvedor');

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_status ON usuarios(perfil, status);

CREATE TABLE IF NOT EXISTS avisos_sistema (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'info',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inicio_em TIMESTAMP NULL,
  fim_em TIMESTAMP NULL,
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_avisos_sistema_ativos
  ON avisos_sistema(ativo, inicio_em, fim_em);

COMMENT ON COLUMN usuarios.perfil IS 'Perfis oficiais: usuario, tecnico, admin, desenvolvedor';
