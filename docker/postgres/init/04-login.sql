ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS perfil VARCHAR(20) NOT NULL DEFAULT 'usuario';

UPDATE usuarios
SET perfil = 'usuario'
WHERE perfil IS NULL OR perfil NOT IN ('usuario', 'admin');

CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil
  ON usuarios (perfil);
