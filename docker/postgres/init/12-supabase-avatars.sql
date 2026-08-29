-- Responsabilidade: Configuração de infraestrutura de 12 supabase avatars.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
