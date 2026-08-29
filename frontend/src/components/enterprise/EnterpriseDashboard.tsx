/**
 * Responsabilidade: Componente de interface de enterprise dashboard; apresenta dados e interações do usuário.
 */
import React from "react";

export default function EnterpriseDashboard() {
  const cards = [
    ["Chamados abertos", "128"],
    ["Resolvidos hoje", "54"],
    ["SLA cumprido", "96%"],
    ["Tempo médio", "18 min"],
  ];

  return (
    <section className="enterprise-dashboard">
      {cards.map(([title, value]) => (
        <article key={title}>
          <span>{title}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
