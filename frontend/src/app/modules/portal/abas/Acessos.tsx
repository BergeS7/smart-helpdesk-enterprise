/**
 * Responsabilidade: aba Meus acessos do portal: sistemas e permissões do solicitante.
 */
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card } from "../../../components/shared/FormPrimitives";
import type { PainelPortal } from "../useUserPortal";

export function AbaAcessos({ portal }: { portal: PainelPortal }) {
  const { usuarioAtual, acessosVisiveis } = portal;
  return (
    <section className="space-y-4">
      <Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Transparência de acesso</p><h2 className="mt-1 text-xl font-black">O que seu perfil permite</h2><p className="mt-2 text-sm text-zinc-500">Seu perfil é <b className="capitalize text-zinc-700">{usuarioAtual.perfil || "usuário"}</b>. A equipe administradora pode conceder acessos adicionais quando necessário.</p></div><span className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><ShieldCheck size={16}/>{acessosVisiveis.filter((item) => item.allowed).length} de {acessosVisiveis.length} recursos</span></div></Card>
      <div className="grid gap-3 md:grid-cols-2">{acessosVisiveis.map((item) => <article key={item.label} className={`rounded-2xl border p-4 ${item.allowed ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50"}`}><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.allowed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>{item.allowed ? <CheckCircle2 size={18}/> : <LockKeyhole size={18}/>}</span><div><h3 className="text-sm font-black">{item.label}</h3><p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p><span className={`mt-3 inline-block text-[10px] font-black uppercase tracking-wide ${item.allowed ? "text-emerald-700" : "text-zinc-500"}`}>{item.allowed ? "Acesso liberado" : "Acesso não concedido"}</span></div></div></article>)}</div>
      <Card><div className="flex items-center gap-3"><KeyRound className="text-blue-600" size={20}/><div><h3 className="text-sm font-black">Precisa de outro acesso?</h3><p className="mt-1 text-xs text-zinc-500">Entre em contato com o suporte ou com o administrador. As permissões são liberadas de acordo com sua função.</p></div></div></Card>
    </section>
  );
}
