-- Armazena somente o caminho privado do objeto no bucket `avatars`.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
