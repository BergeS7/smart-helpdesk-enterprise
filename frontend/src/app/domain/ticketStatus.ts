/**
 * Responsabilidade: Módulo de ticket status; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
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

// Espelha TRANSITIONS do backend (src/domain/ticketStatus.js): o que ele recusa com 409.
const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"],
  IN_PROGRESS: ["WAITING_USER", "WAITING_THIRD_PARTY", "RESOLVED", "CLOSED", "CANCELED"],
  WAITING_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"],
  WAITING_THIRD_PARTY: ["IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  CANCELED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_USER", "WAITING_THIRD_PARTY", "RESOLVED", "CLOSED", "CANCELED"],
};

export function canTransitionTicket(from?: string | null, to?: string | null) {
  const source = canonicalTicketStatus(from);
  const target = canonicalTicketStatus(to);
  return source === target || TRANSITIONS[source].includes(target);
}

// Status a enviar ao soltar um chamado na coluna `coluna` do Kanban, ou null se a API recusaria.
// Concluído só sai para "Em andamento", via REOPENED (o backend grava IN_PROGRESS e checa o prazo).
export function kanbanDropStatus(from: string | null | undefined, coluna: TicketStatus): TicketStatus | null {
  if (isFinalTicketStatus(from)) return coluna === TICKET_STATUS.IN_PROGRESS ? TICKET_STATUS.REOPENED : null;
  return canTransitionTicket(from, coluna) ? coluna : null;
}

// Espelha a janela de reabertura do backend (src/domain/ticketStatus.js): mesmo prazo, mesma regra.
export const REOPEN_WINDOW_DAYS = 7;

export function reopenDeadline(finalizadoEm?: string | null): Date | null {
  if (!finalizadoEm) return null;
  const base = new Date(finalizadoEm);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isReopenWindowOpen(finalizadoEm?: string | null, now: Date = new Date()): boolean {
  const deadline = reopenDeadline(finalizadoEm);
  if (!deadline) return true;
  return deadline.getTime() >= now.getTime();
}
