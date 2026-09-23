/**
 * Responsabilidade: Animações de entrada compartilhadas pelos painéis (Visão operacional, Indicadores,
 * Relatórios e Ativos). As classes motion-* ficam em styles/design-system.css.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

// Só o atraso varia por elemento; a animação em si vem da classe CSS.
export const enter = (delay: number): CSSProperties => ({ animationDelay: `${delay}ms` });

// Conta do valor anterior até o novo; na primeira exibição, parte de zero.
// Na atualização automática só anima o que mudou (o valor anterior é lembrado).
export function CountUp({ value, decimals = 0, duration = 900 }: { value: number; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { from.current = value; setShown(value); return; }
    const origin = from.current, start = window.performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setShown(origin + (value - origin) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => { window.cancelAnimationFrame(frame); from.current = value; };
  }, [value, duration]);
  return <>{shown.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}

// Listas vivas (Fila, Kanban): compara com a renderização anterior para animar só o que mudou.
// - isNew(id): item que acabou de chegar (ganha entrada); na primeira exibição nada é "novo".
// - epoch: muda quando muitos itens entram/saem de uma vez (filtro, troca de aba). Usado como
//   key do container, faz a lista trocar sem animar dezenas de itens ao mesmo tempo.
export function useListChanges(ids: Array<number | string>, bulkLimit = 6) {
  const seen = useRef<Set<string> | null>(null);
  const epoch = useRef(0);
  const current = ids.map(String);
  const previous = seen.current;
  let added = new Set<string>();
  if (previous) {
    added = new Set(current.filter((id) => !previous.has(id)));
    const kept = new Set(current);
    const removed = [...previous].filter((id) => !kept.has(id)).length;
    if (added.size + removed > bulkLimit) { epoch.current += 1; added = new Set(); }
  }
  useEffect(() => { seen.current = new Set(current); });
  return { epoch: epoch.current, isNew: (id: number | string) => added.has(String(id)) };
}

// Anima números e textos numéricos simples ("85%", "92.5%", "4.5/5"); outros textos ("2h 10min") ficam como estão.
export function AnimatedValue({ value }: { value: string | number | null | undefined }) {
  if (typeof value === "number") return Number.isFinite(value) ? <CountUp value={value} /> : <>{value}</>;
  const match = /^(\d+)(?:[.,](\d+))?(%|\/5)?$/.exec(String(value ?? "").trim());
  if (!match) return <>{value}</>;
  const decimals = match[2]?.length || 0;
  return <><CountUp value={Number(`${match[1]}.${match[2] || 0}`)} decimals={decimals} />{match[3] || ""}</>;
}
