/**
 * Regras de abertura de chamado pelo portal e conta "Equipamentos compartilhados".
 *
 * 1. usuarios.conta_compartilhada: marca a conta de sistema que a equipe usa como solicitante dos
 *    equipamentos sem responsável (PCs da oficina, recepção...). Ninguém faz login com ela; existe no
 *    máximo uma por empresa (índice único parcial) e é criada sob demanda pelo backend.
 *
 * 2. configuracoes_sistema.avaliacaoObrigatoriaDesde: data de corte da avaliação obrigatória. Só os
 *    chamados finalizados a partir da publicação desta versão bloqueiam um novo chamado; os antigos
 *    sem avaliação ficam como estão, para ninguém ser travado no dia da implantação.
 *    Empresa criada depois não recebe a chave e a regra vale para todos os chamados dela.
 *
 * Só adiciona estrutura: nenhum dado existente é alterado.
 */
exports.up = (pgm) => pgm.sql(`
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS conta_compartilhada BOOLEAN NOT NULL DEFAULT FALSE;
  CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_conta_compartilhada
    ON usuarios (empresa_id) WHERE conta_compartilhada;
  COMMENT ON COLUMN usuarios.conta_compartilhada IS 'Conta de sistema usada como solicitante de equipamentos sem responsável; não faz login';

  INSERT INTO configuracoes_sistema (empresa_id, chave, valor)
  SELECT e.id, 'avaliacaoObrigatoriaDesde', to_char(CURRENT_TIMESTAMP::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS')
    FROM empresas e
  ON CONFLICT (empresa_id, chave) DO NOTHING;
`);

exports.down = (pgm) => pgm.sql(`
  DELETE FROM configuracoes_sistema WHERE chave = 'avaliacaoObrigatoriaDesde';
  DROP INDEX IF EXISTS uq_usuarios_conta_compartilhada;
  ALTER TABLE usuarios DROP COLUMN IF EXISTS conta_compartilhada;
`);
