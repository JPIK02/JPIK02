// Service worker : garde l'app sur l'appareil (ouverture instantanée, même hors ligne) et affiche les notifications push.
// L'app s'ouvre avec la version gardée ; la nouvelle version est téléchargée en arrière-plan et sert à l'ouverture suivante.
// Fichiers à garder : dist/precache.json (scripts/precache.js). Les données passent par Firestore, jamais par ce cache.
const IGN = { ignoreVary: true, ignoreSearch: false };
const SHELL = "lamaelle-app", PAGE = "/", LIST = "/precache.json", PREV = "/__precache-precedent.json";

self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(refresh().catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// Télécharge la page et les fichiers de la version en ligne ; garde aussi ceux de la version précédente
// (une page déjà ouverte peut encore en charger un, comme le module PDF), efface les plus anciens.
let running = null;
function refresh() {
  return running || (running = (async () => {
    const c = await caches.open(SHELL);
    const [page, list] = await Promise.all([fetch(PAGE, { cache: "no-store" }), fetch(LIST, { cache: "no-store" })]);
    if (!page.ok || !list.ok) return;
    const { files = [] } = await list.clone().json();
    for (const f of files) if (!(await c.match(f, IGN))) { const r = await fetch(f); if (r.ok) await c.put(f, r); }
    const old = await c.match(LIST), prev = old ? (await old.json()).files || [] : [];
    const changed = JSON.stringify(prev) !== JSON.stringify(files);
    const keep = new Set([...files, ...(changed ? prev : ((await (await c.match(PREV))?.json())?.files || []))]);
    for (const req of await c.keys()) { const u = new URL(req.url).pathname; if (u.startsWith("/assets/") && !keep.has(u)) await c.delete(req); }
    if (changed && old) await c.put(PREV, new Response(JSON.stringify({ files: prev })));
    await c.put(LIST, list);
    await c.put(PAGE, page);
  })().finally(() => { running = null; }));
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/__/")) return;
  if (req.mode === "navigate" && !url.pathname.startsWith("/adresse")) { // la page publique du lien d'adresse n'est jamais servie depuis l'app gardée
    // page : la version gardée tout de suite, mise à jour en arrière-plan ; sans copie, le réseau
    e.respondWith((async () => {
      const hit = await caches.match(PAGE, IGN);
      if (hit) { e.waitUntil(refresh().catch(() => {})); return hit; }
      try { const r = await fetch(req); e.waitUntil(refresh().catch(() => {})); return r; } catch (_) { return Response.error(); }
    })());
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/")) {
    // fichiers à nom unique (et polices) : la copie gardée, sinon le réseau (et on la garde)
    e.respondWith(caches.match(req, IGN).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return r;
    })));
  }
});
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Lamaelle", {
    body: d.body || "", tag: d.tag, data: { url: d.url || "/" }, icon: "/icon-192.png", badge: "/icon-192.png",
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ("focus" in w) { w.navigate(url).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
