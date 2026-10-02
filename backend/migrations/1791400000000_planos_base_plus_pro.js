/**
 * Planos comerciais novos: Base, Plus e Pro (preço fixo com faixa de técnicos, ver src/domain/planos.js).
 * Cada plano antigo vai para o equivalente: essencial → base, profissional → plus, enterprise → pro.
 */
exports.up = (pgm) => pgm.sql(`
  ALTER TABLE empresas DROP CONSTRAINT IF EXISTS ck_empresas_plano;
  UPDATE empresas SET plano = CASE plano
    WHEN 'essencial' THEN 'base'
    WHEN 'profissional' THEN 'plus'
    WHEN 'enterprise' THEN 'pro'
    ELSE plano END;
  UPDATE empresas SET plano = 'pro' WHERE plano NOT IN ('base', 'plus', 'pro');
  ALTER TABLE empresas ALTER COLUMN plano SET DEFAULT 'base';
  ALTER TABLE empresas ADD CONSTRAINT ck_empresas_plano CHECK (plano IN ('base', 'plus', 'pro'));
`);

exports.down = (pgm) => pgm.sql(`
  ALTER TABLE empresas DROP CONSTRAINT IF EXISTS ck_empresas_plano;
  UPDATE empresas SET plano = CASE plano
    WHEN 'base' THEN 'essencial'
    WHEN 'plus' THEN 'profissional'
    ELSE 'enterprise' END;
  ALTER TABLE empresas ALTER COLUMN plano SET DEFAULT 'essencial';
  ALTER TABLE empresas ADD CONSTRAINT ck_empresas_plano CHECK (plano IN ('essencial', 'profissional', 'enterprise'));
`);
