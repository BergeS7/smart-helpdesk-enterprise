/**
 * Responsabilidade: Módulo de sw; implementa esta responsabilidade dentro do Smart HelpDesk.
 */
const CACHE = "smart-helpdesk-shell-v7";
const SHELL = ["/", "/offline.html", "/manifest.webmanifest", "/pwa-192-v2.png", "/pwa-512-v2.png"];

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Exibir fallback visível. */ }
  event.waitUntil(self.registration.showNotification(data.title || "Smart HelpDesk", {
    body: data.body || "Você tem uma nova notificação.",
    icon: "/pwa-192-v2.png",
    badge: "/favicon.png",
    tag: data.tag || "smart-helpdesk",
    data: { url: data.url || "/", userId: data.userId },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL("/", self.location.origin);
    try {
      const candidate = new URL(event.notification.data?.url || "/", self.location.origin);
      if (candidate.origin === self.location.origin && candidate.pathname === "/") target = candidate;
    } catch { /* Abrir a página inicial. */ }
    if (target.searchParams.has("pushTicket") && /chamado.*concluído|faça a avaliação/i.test(event.notification.title || "")) {
      target.searchParams.set("pushAction", "avaliar");
    }
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === target.origin);
    if (existing) {
      const navigated = await existing.navigate(target.href);
      if (navigated) return navigated.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put("/", response.clone()));
      return response;
    }).catch(async () => (await caches.match("/")) || caches.match("/offline.html")));
    return;
  }

  // Os bundles com hash ficam sob responsabilidade do cache HTTP. Guardá-los
  // também aqui pode manter uma versão incompatível após uma implantação.
  if (!url.pathname.startsWith("/assets/") && /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
