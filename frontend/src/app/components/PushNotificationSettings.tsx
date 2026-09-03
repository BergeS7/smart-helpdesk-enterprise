import React, { useEffect, useState } from "react";
import { obterPushConfig, obterPushStatus, registrarPush, removerPush } from "../services/api";

const ownerKey = "smart_helpdesk_push_owner";
function browserSupport() {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function PushNotificationSettings({ userId }: { userId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const supported = browserSupport();
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  useEffect(() => {
    if (!supported || (ios && !installed)) return;
    let active = true;
    obterPushConfig().then(({ publicKey }) => { if (active) setPublicKey(publicKey); })
      .catch((error) => { if (active) setMessage(error.message); });
    navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription && window.Notification.permission === "granted" && localStorage.getItem(ownerKey) === String(userId)) {
        const status = await obterPushStatus(subscription.endpoint);
        if (active) {
          setEnabled(status.enabled);
          if (!status.enabled) setMessage("Ative as notificações novamente para continuar recebendo alertas neste aparelho.");
        }
      } else if (active) setEnabled(false);
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Não foi possível verificar a inscrição."); });
    return () => { active = false; };
  }, [userId, supported, ios, installed]);

  async function toggle() {
    setBusy(true); setMessage("");
    try {
      if (!enabled) {
        // A solicitação precisa acontecer diretamente no toque, especialmente no iOS.
        const permission = await window.Notification.requestPermission();
        if (permission !== "granted") throw new Error("Permita as notificações nas configurações do navegador ou do aplicativo para ativar os alertas.");
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      let readyTimeout: ReturnType<typeof setTimeout> | undefined;
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => { readyTimeout = setTimeout(() => reject(new Error("O aplicativo ainda está atualizando. Reabra e tente novamente.")), 15000); }),
      ]).finally(() => clearTimeout(readyTimeout));
      let subscription = await registration.pushManager.getSubscription();
      if (enabled) {
        if (subscription) {
          await removerPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        localStorage.removeItem(ownerKey);
        (await registration.getNotifications()).forEach((notification) => notification.close());
        setEnabled(false); setMessage("Notificações desativadas neste aparelho.");
      } else {
        if (subscription && localStorage.getItem(ownerKey) !== String(userId)) {
          await subscription.unsubscribe(); subscription = null;
        }
        const bytes = Uint8Array.from(window.atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
        subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
        try { await registrarPush(subscription.toJSON()); }
        catch (error) { await subscription.unsubscribe(); throw error; }
        localStorage.setItem(ownerKey, String(userId));
        setEnabled(true); setMessage("Notificações ativadas neste aparelho.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar as notificações."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4 rounded-xl border border-current/10 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold">Notificações neste aparelho</p>{supported && !(ios && !installed) && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 opacity-70"}`}>{enabled ? "Ativadas" : "Desativadas"}</span>}</div>
    <p className="text-xs opacity-70">Receba os alertas dos seus atendimentos na barra de notificações, mesmo com o aplicativo fechado.</p>
    {ios && !installed ? <p className="text-sm">No iPhone, abra este site no Safari, toque em Compartilhar → Adicionar à Tela de Início e abra o aplicativo instalado para ativar. Requer iOS 16.4 ou superior.</p> : !supported ? <p className="text-sm">As notificações não estão disponíveis neste navegador. Abra o aplicativo em um navegador compatível.</p> : <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || (!enabled && !publicKey)} onClick={() => void toggle()} className={`ds-button ${enabled ? "ds-button--secondary" : "ds-button--primary"} disabled:opacity-50`}>{busy ? "Aguarde…" : enabled ? "Desativar neste aparelho" : "Ativar notificações"}</button>
    </div>}
    {message && <p role="status" className="text-xs">{message}</p>}
  </div>;
}
