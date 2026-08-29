/**
 * Responsabilidade: Componente de interface de form primitives; apresenta dados e interações do usuário.
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ds-card shd-card rounded-md border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.055em] text-zinc-500">{label}</span>{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-[110px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${props.className ?? ""}`} />;
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = { primary:"bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100", secondary:"bg-white text-zinc-700 border border-zinc-200 hover:border-blue-200 hover:text-blue-700", danger:"bg-red-600 text-white hover:bg-red-700", ghost:"bg-transparent text-zinc-600 hover:bg-zinc-100" };
  return <button {...props} className={`ds-button ds-button--${variant} shd-button inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}>{children}</button>;
}

export function Modal({ title, children, onClose, wide = false, readOnly = false }: { title:string; children:ReactNode; onClose:()=>void; wide?:boolean; readOnly?:boolean }) {
  return <div className="ds-modal-backdrop shd-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className={`ds-modal shd-modal-panel max-h-[92vh] w-full overflow-auto rounded-lg bg-white shadow-2xl ${readOnly ? "[&_form]:hidden" : ""} ${wide ? "max-w-6xl" : "max-w-3xl"}`}><div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-zinc-100 bg-white px-5 py-3"><h2 className="text-base font-black text-zinc-800">{title}</h2><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-zinc-100" aria-label="Fechar"><X size={19}/></button></div><div className="p-5">{children}</div></div></div>;
}
