/**
 * Responsabilidade: Módulo de ticket status; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
const STATUS = Object.freeze({
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_USER: "WAITING_USER",
  WAITING_THIRD_PARTY: "WAITING_THIRD_PARTY",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
  REOPENED: "REOPENED",
});

const ALL = new Set(Object.values(STATUS));
const FINAL = new Set([STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELED]);
const LABELS = Object.freeze({
  [STATUS.OPEN]: "Em aberto",
  [STATUS.IN_PROGRESS]: "Em andamento",
  [STATUS.WAITING_USER]: "Aguardando usuário",
  [STATUS.WAITING_THIRD_PARTY]: "Aguardando terceiros",
  [STATUS.RESOLVED]: "Resolvido",
  [STATUS.CLOSED]: "Concluído",
  [STATUS.CANCELED]: "Cancelado",
  [STATUS.REOPENED]: "Reaberto",
});

const LEGACY_ALIASES = new Map([
  ["aberto", STATUS.OPEN],
  ["em aberto", STATUS.OPEN],
  ["em andamento", STATUS.IN_PROGRESS],
  ["em analise", STATUS.IN_PROGRESS],
  ["aguardando usuario", STATUS.WAITING_USER],
  ["aguardando cliente", STATUS.WAITING_USER],
  ["pausado", STATUS.WAITING_USER],
  ["aguardando terceiros", STATUS.WAITING_THIRD_PARTY],
  ["resolvido", STATUS.RESOLVED],
  ["concluido", STATUS.CLOSED],
  ["fechado", STATUS.CLOSED],
  ["cancelado", STATUS.CANCELED],
  ["reaberto", STATUS.REOPENED],
]);

const TRANSITIONS = Object.freeze({
  [STATUS.OPEN]: new Set([STATUS.IN_PROGRESS, STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELED]),
  [STATUS.IN_PROGRESS]: new Set([STATUS.WAITING_USER, STATUS.WAITING_THIRD_PARTY, STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELED]),
  [STATUS.WAITING_USER]: new Set([STATUS.IN_PROGRESS, STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELED]),
  [STATUS.WAITING_THIRD_PARTY]: new Set([STATUS.IN_PROGRESS, STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELED]),
  [STATUS.RESOLVED]: new Set([STATUS.CLOSED, STATUS.REOPENED]),
  [STATUS.CLOSED]: new Set([STATUS.REOPENED]),
  [STATUS.CANCELED]: new Set([STATUS.REOPENED]),
  [STATUS.REOPENED]: new Set([STATUS.IN_PROGRESS, STATUS.WAITING_USER, STATUS.WAITING_THIRD_PARTY, STATUS.RESOLVED, STATUS.CLOSED, STATUS.CANCELED]),
});

function normalizeKey(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function canonicalize(value) {
  const raw = String(value || "").trim();
  if (ALL.has(raw)) return raw;
  return LEGACY_ALIASES.get(normalizeKey(raw)) || null;
}

function isFinal(value) {
  return FINAL.has(canonicalize(value));
}

function label(value) {
  const canonical = canonicalize(value);
  return canonical ? LABELS[canonical] : "Status desconhecido";
}

function canTransition(from, to) {
  const source = canonicalize(from);
  const target = canonicalize(to);
  if (!source || !target) return false;
  if (source === target) return true;
  return TRANSITIONS[source]?.has(target) || false;
}

module.exports = { STATUS, ALL, FINAL, LABELS, TRANSITIONS, canonicalize, label, isFinal, canTransition };
