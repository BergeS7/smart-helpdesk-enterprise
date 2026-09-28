/**
 * SaaS multiempresa — fase 2: hierarquia.
 * O perfil "desenvolvedor" deixa de existir: vira o admin da empresa. O acesso à plataforma
 * passa a ser da conta definida em PLATFORM_OWNER_EMAIL, fora da hierarquia de perfis.
 * A restrição impede que perfis legados voltem a ser gravados.
 */
exports.up = (pgm) => pgm.sql(`
  UPDATE usuarios SET perfil = 'admin'
   WHERE LOWER(TRIM(perfil)) IN ('desenvolvedor', 'developer', 'dev', 'super_admin', 'administrador');

  -- Qualquer outro valor fora do conjunto já era tratado como usuário comum pelo backend.
  UPDATE usuarios SET perfil = 'usuario'
   WHERE perfil IS NOT NULL AND perfil NOT IN ('usuario', 'tecnico', 'supervisor', 'admin');

  ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_perfil;
  ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_perfil
    CHECK (perfil IN ('usuario', 'tecnico', 'supervisor', 'admin'));
`);

// Quem era desenvolvedor não é restaurado: o perfil não existe mais no backend.
exports.down = (pgm) => pgm.sql("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_perfil;");
