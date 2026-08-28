/**
 * Marco de adoção do node-pg-migrate.
 *
 * O schema até esta data foi aplicado manualmente via docker/postgres/init/*.sql
 * (primeira execução de volumes novos) e database/migrations/*.sql (ambientes
 * existentes, aplicados um a um na ordem do nome do arquivo). Esta migration
 * não altera nada — ela apenas registra o ponto de partida para que, a partir
 * de agora, toda nova mudança de schema seja criada como uma migration
 * versionada (`npm run migrate:create -- nome_da_mudanca`) e aplicada com
 * `npm run migrate:up`.
 *
 * Não remover nem editar esta migration em ambientes que já a executaram.
 */

exports.up = () => {};

exports.down = () => {};
