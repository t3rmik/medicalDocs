/* Receive shared files locally; never upload the PDF to a MedicalDocs server. */
const DB = 'medicaldocs-shared-files-v1';
const STORE = 'inbox';
const LIMIT = 25 * 1024 * 1024;
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
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
  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/share-target') event.respondWith(receiveSharedFile(request));
});
