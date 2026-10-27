/* MedicalDocs Pro offline app shell + existing local file share target. */
const DB = 'medicaldocs-shared-files-v1';
const STORE = 'inbox';
const LIMIT = 25 * 1024 * 1024;
const ROOT_URL = new URL('/', self.location.origin).href;
const CACHE_PREFIX = 'medicaldocs-offline-';
const SHELL_CACHE = CACHE_PREFIX + 'shell-v1';
const ASSET_CACHE = CACHE_PREFIX + 'assets-v1';
const BOOT_ASSETS = [
  '/medicaldocs-mark.svg',
  '/icons/medicaldocs-192.png',
  '/icons/medicaldocs-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await precacheAppShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && !keep.has(name))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function sameOriginStaticAssets(html) {
  const urls = new Set(BOOT_ASSETS.map((path) => new URL(path, self.location.origin).href));
  const expression = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(expression)) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin !== self.location.origin) continue;
      if (url.pathname.startsWith('/_next/static/') ||
          url.pathname.startsWith('/icons/') ||
          url.pathname === '/medicaldocs-mark.svg') {
        urls.add(url.href);
      }
    } catch {
      // Ignore malformed links in the HTML shell.
    }
  }
  return Array.from(urls).slice(0, 140);
}

async function precacheAppShell() {
  const shell = await caches.open(SHELL_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  try {
    const response = await fetch(ROOT_URL, { cache: 'reload', credentials: 'same-origin' });
    if (response.ok && response.type !== 'opaque') {
      await shell.put(ROOT_URL, response.clone());
      const html = await response.clone().text();
      await Promise.allSettled(sameOriginStaticAssets(html).map(async (url) => {
        const assetResponse = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
        if (assetResponse.ok && assetResponse.type !== 'opaque') {
          await assets.put(url, assetResponse.clone());
        }
      }));
    }
  } catch {
    // Keep worker installation non-blocking on unreliable networks.
  }
  await Promise.allSettled(BOOT_ASSETS.map(async (path) => {
    const url = new URL(path, self.location.origin).href;
    if (await assets.match(url)) return;
    const response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok && response.type !== 'opaque') await assets.put(url, response.clone());
  }));
}

function offlinePage() {
  return new Response(
    '<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1519"><title>MedicalDocs Pro · Offline</title><body style="margin:0;background:#0b1519;color:#e1ecee;font:16px/1.6 system-ui,sans-serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:34rem;padding:2rem"><h1 style="color:#9be4de">MedicalDocs Pro</h1><h2>Sei senza connessione</h2><p>La schermata di avvio non è ancora disponibile offline. Riconnettiti e apri MedicalDocs Pro almeno una volta, così l’app potrà salvare i file necessari per l’uso senza rete.</p><button onclick="location.reload()" style="border:1px solid #35505a;border-radius:10px;background:#182c34;color:#e1ecee;padding:.7rem 1rem;font:inherit">Riprova</button></main></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque' && url.pathname === '/') {
      const shell = await caches.open(SHELL_CACHE);
      await shell.put(ROOT_URL, response.clone());
    }
    return response;
  } catch {
    if (url.pathname === '/') {
      const cachedShell = await caches.open(SHELL_CACHE);
      const cached = await cachedShell.match(ROOT_URL);
      if (cached) return cached;
    }
    return offlinePage();
  }
}

function shouldCacheAsset(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.pathname === '/medicaldocs-sw.js' || url.pathname === '/share-target') return false;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/image')) return false;
  if (url.pathname.startsWith('/_next/')) return url.pathname.startsWith('/_next/static/');
  return ['script', 'style', 'font', 'image', 'worker'].includes(request.destination) ||
    url.pathname.startsWith('/icons/') || url.pathname === '/medicaldocs-mark.svg';
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Questa risorsa non è stata ancora salvata per l’uso offline. Riconnettiti e riprova.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

function redirectToApp(query) {
  const url = new URL('/', self.location.origin);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return Response.redirect(url.toString(), 303);
}

function openInbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB non disponibile'));
  });
}

async function receiveSharedFile(request) {
  try {
    const form = await request.formData();
    let file = null;
    for (const [key, value] of form.entries()) {
      if ((key === 'files' || key === 'files[]') && typeof value !== 'string' && value && typeof value.name === 'string') { file = value; break; }
    }
    if (!file || !file.name) return redirectToApp({ shareFailed: 'no-file' });
    const supported = /\.(pdf|docx|txt|html?)$/i.test(file.name)
      || ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/html'].includes(file.type);
    if (!supported) return redirectToApp({ shareFailed: 'unsupported' });
    if (file.size > LIMIT) return redirectToApp({ shareFailed: 'too-large' });
    const db = await openInbox();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.clear();
        store.add({ name: file.name, type: file.type || 'application/octet-stream', createdAt: Date.now(), lastModified: file.lastModified || Date.now(), file });
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error || new Error('Salvataggio file non riuscito'));
        tx.onabort = () => reject(tx.error || new Error('Salvataggio file interrotto'));
      });
    } finally { db.close(); }
    return redirectToApp({ shared: '1' });
  } catch { return redirectToApp({ shareFailed: 'handoff' }); }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Preserve Android's existing share-target POST flow. API/AI/export responses are never cached.
  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/share-target') {
    event.respondWith(receiveSharedFile(request));
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (shouldCacheAsset(request, url)) event.respondWith(cacheFirstAsset(request));
});
