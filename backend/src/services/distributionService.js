/**
 * Responsabilidade: limites de carga dos técnicos (status ativos e capacidade), usados ao assumir e delegar.
 */

const ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER", "WAITING_THIRD_PARTY", "REOPENED"];
const TECHNICIAN_CAPACITY = 8;

module.exports = { ACTIVE_STATUSES, TECHNICIAN_CAPACITY };
