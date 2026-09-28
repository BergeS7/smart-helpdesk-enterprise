/**
 * Área de atuação por empresa: as unidades cadastradas por cada empresa (ativo_unidades) substituem
 * a lista fixa de municípios da Maranhão Motos no código. Coordenadas passam a ser opcionais, para
 * uma empresa cadastrar filiais sem precisar informar latitude e longitude (ficam só fora do mapa).
 */
exports.up = (pgm) => pgm.sql(`
  ALTER TABLE ativo_unidades ALTER COLUMN latitude DROP NOT NULL;
  ALTER TABLE ativo_unidades ALTER COLUMN longitude DROP NOT NULL;
`);

// Unidades sem coordenada recebem 0,0 para o rollback não falhar.
exports.down = (pgm) => pgm.sql(`
  UPDATE ativo_unidades SET latitude = COALESCE(latitude, 0), longitude = COALESCE(longitude, 0);
  ALTER TABLE ativo_unidades ALTER COLUMN latitude SET NOT NULL;
  ALTER TABLE ativo_unidades ALTER COLUMN longitude SET NOT NULL;
`);
