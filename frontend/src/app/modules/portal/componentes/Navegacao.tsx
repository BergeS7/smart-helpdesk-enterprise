/**
 * Responsabilidade: botões de navegação do portal (barra lateral, barra inferior e menu Mais no celular).
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function MobileNavButton({
  icon,
  label,
  active,
  badge,
  dark = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  dark?: boolean;
  onClick: () => void;
}) {
  const activeClass = active
    ? "text-blue-600"
    : dark
      ? "text-white/62"
      : "text-zinc-500";
  const iconClass = active
    ? "bg-blue-50 text-blue-600"
    : dark
      ? "text-white/70"
      : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-black transition ${activeClass}`}
      title={label}
    >
      <span
        className={`relative grid h-8 w-10 place-items-center rounded-2xl transition ${iconClass}`}
      >
        {icon}
        {badge && (
          <span className="absolute -right-0.5 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] leading-none text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate leading-none">{label}</span>
    </button>
  );
}

export function MobileMoreSheet({
  title,
  children,
  dark = false,
  onClose,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar menu"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <section
        className={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t p-4 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl ${dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900"}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-2 transition ${dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-2">{children}</div>
      </section>
    </div>
  );
}

export function MobileMoreAction({
  icon,
  label,
  badge,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-black transition ${danger ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}`}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${danger ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge && (
        <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
          {badge}
        </span>
      )}
    </button>
  );
}

export function UsuarioSidebarButton({
  icon,
  label,
  ativo = false,
  badge,
  onClick,
  title,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  ativo?: boolean;
  badge?: string;
  onClick?: () => void;
  title?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      className={`relative flex h-12 w-full items-center justify-center text-sm font-bold transition ${compact ? "rounded-none px-0" : "gap-3 rounded-xl px-3"} ${ativo ? "bg-white/10 text-white shadow-lg shadow-black/10" : "text-white/72 hover:bg-white/7 hover:text-white"}`}
    >
      {ativo && (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
      )}
      <span className="grid h-8 w-8 shrink-0 place-items-center">{icon}</span>
      <span className={compact ? "sr-only" : "min-w-0 flex-1 truncate text-left"}>{label}</span>
      {badge && (
        <span className={`grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white ${compact ? "absolute right-1 top-1" : ""}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
