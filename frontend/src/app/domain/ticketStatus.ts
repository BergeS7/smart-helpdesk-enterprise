export const TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_USER: "WAITING_USER",
  WAITING_THIRD_PARTY: "WAITING_THIRD_PARTY",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
  REOPENED: "REOPENED",
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

const labels: Record<TicketStatus, string> = {
  OPEN: "Em aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_USER: "Aguardando usuário",
  WAITING_THIRD_PARTY: "Aguardando terceiros",
  RESOLVED: "Resolvido",
  CLOSED: "Concluído",
  CANCELED: "Cancelado",
  REOPENED: "Reaberto",
};

const aliases: Record<string, TicketStatus> = {
  aberto: TICKET_STATUS.OPEN,
  "em aberto": TICKET_STATUS.OPEN,
  "em andamento": TICKET_STATUS.IN_PROGRESS,
  "em analise": TICKET_STATUS.IN_PROGRESS,
  "aguardando usuario": TICKET_STATUS.WAITING_USER,
  "aguardando cliente": TICKET_STATUS.WAITING_USER,
  pausado: TICKET_STATUS.WAITING_USER,
  "aguardando terceiros": TICKET_STATUS.WAITING_THIRD_PARTY,
  resolvido: TICKET_STATUS.RESOLVED,
  concluido: TICKET_STATUS.CLOSED,
  fechado: TICKET_STATUS.CLOSED,
  cancelado: TICKET_STATUS.CANCELED,
  reaberto: TICKET_STATUS.REOPENED,
};

export function canonicalTicketStatus(value?: string | null): TicketStatus {
  const raw = String(value || "").trim();
  if (raw in labels) return raw as TicketStatus;
  const key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return aliases[key] || TICKET_STATUS.OPEN;
}

export function ticketStatusLabel(value?: string | null) {
  return labels[canonicalTicketStatus(value)];
}

export function isFinalTicketStatus(value?: string | null) {
  return [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED, TICKET_STATUS.CANCELED].includes(canonicalTicketStatus(value) as typeof TICKET_STATUS.RESOLVED);
}
