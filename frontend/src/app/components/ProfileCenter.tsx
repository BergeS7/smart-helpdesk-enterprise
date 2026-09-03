/**
 * Responsabilidade: Componente de interface de profile center; apresenta dados e interações do usuário.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Bell, Camera, Check, ChevronRight, Download, Eye, LogOut, MonitorCog, Palette, ShieldCheck, Trash2, UserCog, X } from "lucide-react";
import { listarCatalogo, type ApiUsuario } from "../services/api";
import { PushNotificationSettings } from "./PushNotificationSettings";

type Draft = Pick<ApiUsuario, "nome" | "telefone" | "departamento" | "cargo">;
type Section = "geral" | "preferencias" | "notificacoes" | "seguranca" | "privacidade";
type Preferences = { density: "compacta" | "confortavel"; sound: boolean; desktop: boolean; email: boolean; sla: boolean; messages: boolean };

const defaults: Preferences = { density: "compacta", sound: false, desktop: true, email: true, sla: true, messages: true };

export function ProfileCenter({ profile, draft, setDraft, photo, initials, uploading, saving, dark = false, stats, onSave, onPhoto, onRemovePhoto, onClose, onLogout }: {
  profile: ApiUsuario;
  draft: Draft;
  setDraft: (draft: Draft) => void;
  photo: string;
  initials: string;
  uploading: boolean;
  saving: boolean;
  dark?: boolean;
  stats?: { abertos: number; andamento: number; concluidos: number; atrasados: number };
  onSave: (event: FormEvent) => void;
  onPhoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [section, setSection] = useState<Section>("geral");
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [cargos, setCargos] = useState<string[]>([]);
  const storageKey = `smart_helpdesk_profile_preferences_${profile.id}`;
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") }; } catch { return defaults; }
  });
  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(preferences)), [preferences, storageKey]);
  useEffect(() => {
    Promise.all([listarCatalogo("departamentos"), listarCatalogo("cargos")])
      .then(([departmentItems, roleItems]) => {
        setDepartamentos(departmentItems.filter((item) => item.ativo !== false).map((item) => item.nome));
        setCargos(roleItems.filter((item) => item.ativo !== false && !["desenvolvedor", "developer"].includes(item.nome.trim().toLocaleLowerCase("pt-BR"))).map((item) => item.nome));
      })
      .catch(() => {
        setDepartamentos([]);
        setCargos([]);
      });
  }, []);

  const departmentOptions = Array.from(new Set(departamentos)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const roleOptions = Array.from(new Set(cargos)).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const sections = [
    { id: "geral" as const, label: "Visão geral", icon: UserCog, hint: "Dados e atividade" },
    { id: "preferencias" as const, label: "Preferências", icon: Palette, hint: "Aparência e uso" },
    { id: "notificacoes" as const, label: "Notificações", icon: Bell, hint: "Canais e alertas" },
    { id: "seguranca" as const, label: "Segurança", icon: ShieldCheck, hint: "Sessão e acesso" },
    { id: "privacidade" as const, label: "Privacidade", icon: Eye, hint: "Dados e LGPD" },
  ];
  const surface = dark ? "border-white/10 bg-[#101827] text-white" : "border-zinc-200 bg-white text-zinc-900";
  const panel = dark ? "border-white/10 bg-white/[.04]" : "border-zinc-200 bg-zinc-50/70";
  const muted = dark ? "text-white/55" : "text-zinc-500";
  const input = `h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${dark ? "border-white/10 bg-white/5 text-white" : "border-zinc-200 bg-white"}`;
  const updatePreference = (key: keyof Preferences, value: boolean | Preferences["density"]) => setPreferences((current) => ({ ...current, [key]: value }));
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ usuario: { id: profile.id, nome: profile.nome, email: profile.email, telefone: profile.telefone, cargo: profile.cargo, departamento: profile.departamento, perfil: profile.perfil, criado_em: profile.criado_em, ultimo_login_em: profile.ultimo_login_em }, preferencias: preferences }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `meus-dados-smart-helpdesk-${profile.id}.json`; link.click(); URL.revokeObjectURL(link.href);
  };

  return <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex justify-end">
    <button type="button" aria-label="Fechar perfil" className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
    <aside className={`profile-center relative z-10 flex h-full w-full max-w-[920px] flex-col border-l shadow-2xl ${surface}`}>
      <header className={`flex items-center justify-between border-b px-5 py-4 ${dark ? "border-white/10" : "border-zinc-100"}`}>
        <div><p className="flex items-center gap-2 text-base font-black"><UserCog size={18} />Meu perfil</p><p className={`mt-0.5 text-xs ${muted}`}>Conta, preferências, segurança e privacidade.</p></div>
        <button type="button" onClick={onClose} title="Fechar perfil" aria-label="Fechar perfil" className={`rounded-xl p-2 transition ${dark ? "hover:bg-white/10" : "hover:bg-zinc-100"}`}><X size={19} /></button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[235px_1fr]">
        <nav className={`border-b p-4 md:border-b-0 md:border-r ${dark ? "border-white/10" : "border-zinc-100"}`}>
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-600 font-black text-white">{photo ? <img src={photo} alt={profile.nome} className="h-full w-full object-cover" /> : initials}</div>
            <div className="min-w-0"><p className="truncate text-sm font-black">{profile.nome}</p><p className={`truncate text-xs ${muted}`}>{profile.email}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:block md:space-y-1">{sections.map(({ id, label, icon: Icon, hint }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${section === id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : dark ? "hover:bg-white/5" : "hover:bg-zinc-100"}`}><Icon size={17} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{label}</span><span className={`hidden truncate text-[10px] md:block ${section === id ? "text-blue-100" : muted}`}>{hint}</span></span><ChevronRight size={14} className="hidden md:block" /></button>)}</div>
        </nav>
        <main className="min-h-0 overflow-auto p-5 sm:p-6">
          <div key={section} className="settings-section-enter">
            {section === "geral" && <div className="space-y-5">
              <div><h2 className="text-xl font-black">Visão geral</h2><p className={`text-sm ${muted}`}>Mantenha seus dados atualizados para identificação e triagem.</p></div>
              {stats && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Abertos",stats.abertos,"text-blue-600"],["Em andamento",stats.andamento,"text-amber-600"],["Resolvidos",stats.concluidos,"text-emerald-600"],["SLA vencido",stats.atrasados,"text-red-600"]].map(([label,value,color]) => <div key={String(label)} className={`rounded-2xl border p-4 ${panel}`}><p className={`text-xs font-bold uppercase ${muted}`}>{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{value}</p></div>)}</div>}
              <div className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${panel}`}><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-2xl font-black text-white">{photo ? <img src={photo} alt={profile.nome} className="h-full w-full object-cover" /> : initials}</div><div className="flex-1"><p className="font-black">Foto do perfil</p><p className={`mb-3 text-xs ${muted}`}>PNG, JPG ou WEBP, até 5 MB.</p><div className="flex flex-wrap gap-2"><label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white ${uploading ? "pointer-events-none opacity-60" : ""}`}><Camera size={14}/>{uploading ? "Enviando..." : "Trocar foto"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPhoto}/></label>{photo && <button type="button" onClick={onRemovePhoto} className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600"><Trash2 size={14}/>Remover</button>}</div></div><span className="self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Conta ativa</span></div>
              <form onSubmit={onSave} className={`rounded-2xl border p-5 ${panel}`}><div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Nome"><input required className={input} value={draft.nome || ""} onChange={(e)=>setDraft({...draft,nome:e.target.value})}/></ProfileField><ProfileField label="E-mail"><input className={`${input} opacity-60`} value={profile.email} disabled/></ProfileField><ProfileField label="Telefone"><input className={input} value={draft.telefone || ""} onChange={(e)=>setDraft({...draft,telefone:e.target.value})}/></ProfileField><ProfileField label="Cargo"><select className={input} value={draft.cargo || ""} onChange={(e)=>setDraft({...draft,cargo:e.target.value})}><option value="">Selecione o cargo</option>{roleOptions.map((role)=><option key={role} value={role}>{role}</option>)}</select></ProfileField><ProfileField label="Departamento"><select className={input} value={draft.departamento || ""} onChange={(e)=>setDraft({...draft,departamento:e.target.value})}><option value="">Selecione o departamento</option>{departmentOptions.map((department)=><option key={department} value={department}>{department}</option>)}</select></ProfileField><ProfileField label="Perfil de acesso"><input className={`${input} capitalize opacity-60`} value={profile.perfil} disabled/></ProfileField></div><button disabled={saving} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"><Check size={16}/>{saving ? "Salvando..." : "Salvar alterações"}</button></form>
            </div>}
            {section === "preferencias" && <ProfileSettings title="Preferências" description="Ajuste como o sistema se comporta neste navegador." panel={panel} muted={muted}><Choice title="Densidade da interface" description="Escolha quanto conteúdo aparece na tela."><select className={input} value={preferences.density} onChange={(e)=>updatePreference("density",e.target.value as Preferences["density"])}><option value="compacta">Compacta</option><option value="confortavel">Confortável</option></select></Choice><Toggle title="Alertas sonoros" description="Tocar som em eventos importantes." value={preferences.sound} onChange={(v)=>updatePreference("sound",v)}/></ProfileSettings>}
            {section === "notificacoes" && <ProfileSettings title="Notificações" description="Defina quais alertas deseja receber." panel={panel} muted={muted}><PushNotificationSettings userId={profile.id}/><Toggle title="Notificações no sistema" description="Exibir alertas enquanto estiver usando o HelpDesk." value={preferences.desktop} onChange={(v)=>updatePreference("desktop",v)}/><Toggle title="Avisos por e-mail" description={`Enviar para ${profile.email}.`} value={preferences.email} onChange={(v)=>updatePreference("email",v)}/><Toggle title="Alertas de SLA" description="Avisar quando um chamado estiver perto do vencimento." value={preferences.sla} onChange={(v)=>updatePreference("sla",v)}/><Toggle title="Novas mensagens" description="Avisar quando houver interação em um chamado." value={preferences.messages} onChange={(v)=>updatePreference("messages",v)}/></ProfileSettings>}
            {section === "seguranca" && <ProfileSettings title="Segurança" description="Informações reais da sessão atual." panel={panel} muted={muted}><Info icon={<ShieldCheck size={18}/>} title="Sessão autenticada" text="Seu acesso atual é protegido por token e exige nova autenticação quando expira."/><Info icon={<MonitorCog size={18}/>} title="Último acesso registrado" text={profile.ultimo_login_em ? new Date(profile.ultimo_login_em).toLocaleString("pt-BR") : "Ainda não informado pelo servidor."}/><button type="button" onClick={onLogout} className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut size={16}/>Encerrar esta sessão</button><p className={`text-xs ${muted}`}>A troca de senha continua disponível na recuperação de acesso da tela de login.</p></ProfileSettings>}
            {section === "privacidade" && <ProfileSettings title="Privacidade e LGPD" description="Transparência e controle sobre os seus dados." panel={panel} muted={muted}><Info icon={<Eye size={18}/>} title="Dados utilizados" text="Nome, e-mail, contato, cargo, departamento, foto e registros necessários para autenticação, triagem e auditoria dos chamados."/><Info icon={<ShieldCheck size={18}/>} title="Finalidade" text="Os dados são utilizados somente para operação, segurança, suporte e rastreabilidade do atendimento."/><button type="button" onClick={exportData} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"><Download size={16}/>Baixar meus dados</button><p className={`text-xs ${muted}`}>Para corrigir ou solicitar exclusão de dados corporativos, entre em contato com o administrador responsável.</p></ProfileSettings>}
          </div>
        </main>
      </div>
    </aside>
  </div>;
}

function ProfileField({label,children}:{label:string;children:React.ReactNode}) { return <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide opacity-60">{label}</span>{children}</label>; }
function ProfileSettings({title,description,panel,muted,children}:{title:string;description:string;panel:string;muted:string;children:React.ReactNode}) { return <div className="space-y-5"><div><h2 className="text-xl font-black">{title}</h2><p className={`text-sm ${muted}`}>{description}</p></div><div className={`space-y-3 rounded-2xl border p-5 ${panel}`}>{children}</div></div>; }
function Choice({title,description,children}:{title:string;description:string;children:React.ReactNode}) { return <div className="grid gap-3 border-b border-current/10 pb-4 sm:grid-cols-[1fr_210px] sm:items-center"><div><p className="text-sm font-bold">{title}</p><p className="text-xs opacity-55">{description}</p></div>{children}</div>; }
function Toggle({title,description,value,onChange}:{title:string;description:string;value:boolean;onChange:(value:boolean)=>void}) { return <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-current/10 py-3 last:border-0"><span><span className="block text-sm font-bold">{title}</span><span className="block text-xs opacity-55">{description}</span></span><input type="checkbox" checked={value} onChange={(e)=>onChange(e.target.checked)} className="h-5 w-5 accent-blue-600"/></label>; }
function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="flex gap-3 border-b border-current/10 pb-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">{icon}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 opacity-60">{text}</p></div></div>; }
