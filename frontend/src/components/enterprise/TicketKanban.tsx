/**
 * Responsabilidade: Componente de interface de ticket kanban; apresenta dados e interações do usuário.
 */
import React from "react";

const columns = [
  "Novo",
  "Em atendimento",
  "Aguardando cliente",
  "Resolvido",
];

export default function TicketKanban() {
  return (
    <div className="ticket-kanban">
      {columns.map(column => (
        <div key={column} className="kanban-column">
          <h3>{column}</h3>
          <p>Chamados da fila</p>
        </div>
      ))}
    </div>
  );
}
