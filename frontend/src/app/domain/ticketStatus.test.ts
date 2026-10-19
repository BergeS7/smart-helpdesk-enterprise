import { describe, expect, it } from "vitest";
import { TICKET_STATUS, canTransitionTicket, kanbanDropStatus } from "./ticketStatus";

describe("kanbanDropStatus", () => {
  it("envia o status da coluna quando a API aceita a transição", () => {
    expect(kanbanDropStatus("OPEN", TICKET_STATUS.IN_PROGRESS)).toBe("IN_PROGRESS");
    expect(kanbanDropStatus("IN_PROGRESS", TICKET_STATUS.WAITING_USER)).toBe("WAITING_USER");
    expect(kanbanDropStatus("WAITING_THIRD_PARTY", TICKET_STATUS.CLOSED)).toBe("CLOSED");
  });

  it("recusa o que a API devolveria com 409", () => {
    expect(kanbanDropStatus("OPEN", TICKET_STATUS.WAITING_USER)).toBeNull();
    expect(kanbanDropStatus("IN_PROGRESS", TICKET_STATUS.OPEN)).toBeNull();
  });

  it("chamado concluído só volta para Em andamento, reabrindo", () => {
    for (const final of ["RESOLVED", "CLOSED", "CANCELED"]) {
      expect(kanbanDropStatus(final, TICKET_STATUS.IN_PROGRESS)).toBe("REOPENED");
      expect(kanbanDropStatus(final, TICKET_STATUS.OPEN)).toBeNull();
      expect(kanbanDropStatus(final, TICKET_STATUS.WAITING_USER)).toBeNull();
    }
  });
});

describe("canTransitionTicket", () => {
  it("aceita manter o mesmo status e entende os nomes antigos", () => {
    expect(canTransitionTicket("Em andamento", "IN_PROGRESS")).toBe(true);
    expect(canTransitionTicket("Fechado", "OPEN")).toBe(false);
  });
});
