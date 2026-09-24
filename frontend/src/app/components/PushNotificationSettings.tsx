import React, { useEffect, useState } from "react";
import { obterPushConfig, obterPushStatus, registrarPush, removerPush } from "../services/api";

const ownerKey = "smart_helpdesk_push_owner";
function browserSupport() {
  return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isIosWithoutInstalledApp() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return ios && !installed;
}

function applicationServerKey(publicKey: string) {
  return Uint8Array.from(window.atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
}

async function ensurePushSubscription(userId: number, publicKey: string) {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && localStorage.getItem(ownerKey) !== String(userId)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
  try { await registrarPush(subscription.toJSON()); }
  catch (error) { await subscription.unsubscribe(); throw error; }
  localStorage.setItem(ownerKey, String(userId));
  return subscription;
}

export function PushNotificationOnboarding({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!browserSupport() || isIosWithoutInstalledApp()) return;
    let active = true;
    obterPushConfig().then(async ({ publicKey: key }) => {
      if (!active) return;
      setPublicKey(key);
      if (window.Notification.permission === "granted") {
        try { await ensurePushSubscription(userId, key); }
        catch { /* A tela de perfil continua disponível para uma nova tentativa. */ }
      } else if (window.Notification.permission === "default") {
        setOpen(true);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);

  async function enable() {
    setBusy(true); setMessage("");
    try {
      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(permission === "denied"
          ? "A permissão foi bloqueada pelo navegador. Por segurança, somente você pode desbloqueá-la nas permissões do site."
          : "A permissão não foi concedida. O aviso aparecerá novamente no próximo acesso.");
        return;
      }
      await ensurePushSubscription(userId, publicKey);
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar as notificações.");
    } finally { setBusy(false); }
  }

  if (!open) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="push-permission-title">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-2xl" aria-hidden="true">🔔</div>
      <h2 id="push-permission-title" className="text-xl font-black">Ative as notificações</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">Permita que o Smart HelpDesk envie atualizações dos seus chamados, mesmo quando o aplicativo estiver fechado. Depois de autorizadas, elas permanecerão ativas neste aparelho.</p>
      {message && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="ds-button ds-button--secondary" disabled={busy} onClick={() => setOpen(false)}>Agora não</button>
        <button type="button" className="ds-button ds-button--primary" disabled={busy || !publicKey} onClick={() => void enable()}>{busy ? "Ativando…" : "Permitir notificações"}</button>
      </div>
    </div>
  </div>;
}

export function PushNotificationSettings({ userId }: { userId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const supported = browserSupport();
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = !isIosWithoutInstalledApp();

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
        subscription = await ensurePushSubscription(userId, publicKey);
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
