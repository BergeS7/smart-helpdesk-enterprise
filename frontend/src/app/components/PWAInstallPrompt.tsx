/**
 * Responsabilidade: Componente de interface de pwainstall prompt; apresenta dados e interações do usuário.
 */
import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "smart_helpdesk_pwa_prompt_dismissed";

export function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [iosHelp, setIosHelp] = useState(false);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const dismissed = sessionStorage.getItem(DISMISS_KEY) === "yes";

  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    const installed = () => { setPrompt(null); setIosHelp(false); };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", installed); };
  }, []);

  if (standalone || dismissed || (!prompt && !isiOS) || !window.isSecureContext) return null;
  const close = () => { sessionStorage.setItem(DISMISS_KEY, "yes"); setPrompt(null); setIosHelp(false); };
  const install = async () => {
    if (isiOS && !prompt) { setIosHelp(true); return; }
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
  };

  return <div className="pwa-install-card fixed inset-x-3 top-3 z-[130] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-blue-200 bg-white p-3 text-zinc-900 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white"><Smartphone size={21}/></span>
    <div className="min-w-0 flex-1"><p className="text-sm font-black">Instalar Smart HelpDesk</p><p className="text-xs leading-5 text-zinc-500">{iosHelp ? <><Share size={13} className="mr-1 inline"/>Toque em Compartilhar e depois em “Adicionar à Tela de Início”.</> : "Use em tela cheia como um aplicativo."}</p></div>
    {!iosHelp && <button type="button" onClick={install} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white"><Download size={14}/>Instalar</button>}
    <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X size={16}/></button>
  </div>;
}
