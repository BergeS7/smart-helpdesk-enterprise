import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { TAB_ICONS, TAB_LABELS, type AdminRouteKey, type NavigationArea } from "../navigation/adminNavigation";

export function WorkspaceNavigation({area,current,onNavigate,onRefresh,tools,dark}:{area:NavigationArea;current:AdminRouteKey;onNavigate:(tab:AdminRouteKey)=>void;onRefresh?:()=>void;tools?:ReactNode;dark:boolean}){
  const AreaIcon=area.icon;
  return <section className={`workspace-navigation nectar-subnav relative z-20 -mx-4 overflow-visible border-x-0 border-b border-t-0 ${dark?"border-white/10 bg-slate-900":"border-slate-200 bg-white"}`}>
    <div className="flex min-h-12 flex-wrap items-center gap-3 px-4 py-1.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${dark?"bg-sky-500/15 text-sky-400":"bg-sky-50 text-sky-500"}`}><AreaIcon size={17}/></span>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate text-sm font-bold">{area.title}</h1><span className={`hidden text-xs font-bold sm:inline ${dark?"text-slate-600":"text-slate-300"}`}>/</span><span className="hidden text-xs font-semibold text-sky-500 sm:inline">{TAB_LABELS[current]}</span></div><p className={`hidden truncate text-[11px] xl:block ${dark?"text-slate-400":"text-slate-400"}`}>{area.description}</p></div>{tools&&<div className="order-last w-full xl:order-none xl:w-[min(720px,52vw)]">{tools}</div>}<span className="hidden items-center gap-1.5 text-[10px] font-semibold text-slate-400 lg:inline-flex"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Atualizado agora</span>{onRefresh&&<button type="button" onClick={onRefresh} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${dark?"border-white/10 hover:bg-white/10":"border-slate-200 bg-white hover:bg-sky-50"}`} title="Atualizar dados" aria-label="Atualizar dados"><RefreshCw size={15}/></button>}
    </div>
    {area.tabs.length>1&&<div role="tablist" aria-label={area.title} className={`flex gap-5 overflow-x-auto border-t px-4 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden ${dark?"border-white/10":"border-slate-200"}`}>
      {area.tabs.map(tab=>{const Icon=TAB_ICONS[tab];const active=tab===current;return <button key={tab} type="button" role="tab" aria-selected={active} aria-current={active?"page":undefined} onClick={()=>onNavigate(tab)} className={`relative inline-flex h-9 shrink-0 items-center gap-2 border-b-2 px-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20 ${active?"border-sky-500 text-sky-500":dark?"border-transparent text-slate-400 hover:border-slate-600 hover:text-white":"border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-700"}`}>{Icon?<Icon size={14}/>:null}{TAB_LABELS[tab]}</button>})}
    </div>}
  </section>;
}
