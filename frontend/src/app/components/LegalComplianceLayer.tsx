import { useEffect, useState } from "react";
import { Cookie, FileText, X } from "lucide-react";

type LegalDocument = "privacy" | "cookies" | "terms" | "monitoring";
const EVENT = "smart-helpdesk-open-legal";
const NOTICE_KEY = "smart_helpdesk_legal_notice_2026-08-08";

export function openLegalDocument(document: LegalDocument) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: document }));
}

const documents: Record<LegalDocument,{title:string;sections:Array<[string,string]>}> = {
  privacy:{title:"Política de Privacidade",sections:[
    ["Controlador e finalidade","A Maranhão Motos determina o tratamento realizado no Smart HelpDesk para autenticação, suporte, segurança, inventário de ativos, auditoria e melhoria operacional. Complete nos documentos corporativos o CNPJ, endereço e contato do encarregado."],
    ["Dados tratados","Nome, e-mail, telefone, cargo, departamento, foto opcional, credenciais protegidas, registros de acesso, chamados, mensagens, anexos, avaliações e dados técnicos dos computadores corporativos."],
    ["Bases e direitos","O tratamento deve estar amparado em base legal definida pela controladora, como execução contratual, obrigação legal ou legítimo interesse avaliado. O titular pode solicitar confirmação, acesso, correção e demais direitos aplicáveis pelo canal do encarregado."],
    ["Retenção e segurança","Métricas técnicas são eliminadas após 90 dias. Outros registros seguem a tabela corporativa de retenção e necessidades de auditoria ou exercício de direitos. O acesso é controlado por perfil e permissão."],
    ["Compartilhamentos","O mapa utiliza OpenStreetMap e dados geográficos do IBGE. Provedores de infraestrutura e e-mail podem atuar como operadores quando configurados, conforme contrato e instruções da controladora."],
  ]},
  cookies:{title:"Cookies e armazenamento local",sections:[
    ["Uso atual","Não utilizamos cookies publicitários ou de rastreamento. Um cookie estritamente funcional pode guardar o estado da barra lateral."],
    ["Armazenamento local","O navegador guarda token de sessão, perfil autenticado, tema, filtros e preferências. Esses itens viabilizam segurança, autenticação e usabilidade e não são vendidos."],
    ["Controle","Preferências podem ser removidas limpando os dados do site no navegador. Remover o token encerra a sessão. Tecnologias estritamente necessárias não podem ser desativadas dentro do sistema sem comprometer seu funcionamento."],
  ]},
  terms:{title:"Termos de Uso",sections:[
    ["Uso autorizado","O Smart HelpDesk é de uso corporativo. O usuário deve proteger suas credenciais, fornecer informações verdadeiras e não inserir conteúdo ilegal, excessivo, sigiloso ou sem relação com o suporte."],
    ["Auditoria","Ações relevantes podem ser registradas para segurança, rastreabilidade, prevenção a fraude e apuração de incidentes, com acesso restrito."],
    ["Propriedade intelectual","O software, sua identidade, código e documentação pertencem aos respectivos titulares ou licenciantes. O acesso não transfere propriedade nem autoriza cópia, engenharia reversa ou exploração não autorizada."],
    ["Responsabilidades","A controladora responde pelas decisões sobre dados e uso organizacional. O desenvolvedor ou fornecedor atua nos limites do contrato e das instruções documentadas, sem exclusão de responsabilidades que a lei considere inderrogáveis."],
  ]},
  monitoring:{title:"Aviso do agente de monitoramento",sections:[
    ["Coleta diária","O agente coleta diariamente hostname, identificador do dispositivo, inventário de hardware e sistema, IP, MAC, usuário conectado, unidade, uso de CPU, memória e disco e estado do antivírus."],
    ["Limites","O agente não coleta arquivos, conteúdo de mensagens, senhas, teclas digitadas, áudio, câmera, histórico de navegação ou GPS."],
    ["Finalidade","Os dados servem exclusivamente para inventário, disponibilidade, segurança e suporte dos equipamentos corporativos. Não devem ser usados para vigilância comportamental incompatível com essa finalidade."],
  ]},
};

export function LegalComplianceLayer(){
  const [open,setOpen]=useState<LegalDocument|null>(null);
  const [notice,setNotice]=useState(()=>localStorage.getItem(NOTICE_KEY)!=="ack");
  useEffect(()=>{const handler=(e:Event)=>setOpen((e as CustomEvent<LegalDocument>).detail);window.addEventListener(EVENT,handler);return()=>window.removeEventListener(EVENT,handler)},[]);
  const acknowledge=()=>{localStorage.setItem(NOTICE_KEY,"ack");setNotice(false)};
  return <>
    {notice&&<div className="legal-privacy-notice fixed inset-x-3 z-[120] mx-auto max-w-4xl rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl"><div className="flex items-start gap-3"><Cookie className="mt-0.5 shrink-0 text-blue-600"/><div className="min-w-0 flex-1"><b className="text-sm">Privacidade e armazenamento funcional</b><p className="mt-1 text-xs leading-5 text-zinc-600">Usamos apenas tecnologias necessárias para sessão, segurança e preferências; não usamos publicidade ou rastreamento comercial.</p><div className="mt-2 flex flex-wrap gap-3 text-xs font-black text-blue-700"><button onClick={()=>setOpen("privacy")}>Privacidade</button><button onClick={()=>setOpen("cookies")}>Cookies</button><button onClick={()=>setOpen("terms")}>Termos</button><button onClick={()=>setOpen("monitoring")}>Monitoramento</button></div></div><button onClick={acknowledge} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">Entendi</button></div></div>}
    {open&&<div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/55 p-4" onMouseDown={(e)=>e.target===e.currentTarget&&setOpen(null)}><section className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><header className="flex items-start justify-between gap-3 border-b pb-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Smart HelpDesk · versão 08/08/2026</p><h2 className="mt-1 text-2xl font-black text-zinc-900">{documents[open].title}</h2></div><button onClick={()=>setOpen(null)}><X/></button></header><div className="space-y-5 py-5">{documents[open].sections.map(([title,text])=><article key={title}><h3 className="font-black text-zinc-800">{title}</h3><p className="mt-1 text-sm leading-6 text-zinc-600">{text}</p></article>)}</div><footer className="border-t pt-4 text-xs leading-5 text-zinc-500"><FileText size={14} className="mr-1 inline"/>Documento resumido para transparência no produto. Consulte a versão integral e valide os campos institucionais com o jurídico/encarregado.</footer></section></div>}
  </>;
}
