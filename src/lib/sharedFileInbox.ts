const DB_NAME = 'medicaldocs-shared-files-v1'
const STORE_NAME = 'inbox'
type InboxRecord = { id?: number; name: string; type: string; createdAt: number; lastModified?: number; file: Blob }

function openInbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Archiviazione temporanea non disponibile')); return }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Impossibile aprire la casella file'))
  })
}
export async function storeSharedFile(file: File): Promise<void> {
  const db = await openInbox()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      // A fresh OS launch replaces any stale file left by a previous interrupted import.
      store.clear()
      store.add({ name: file.name, type: file.type || 'application/octet-stream', createdAt: Date.now(), lastModified: file.lastModified, file } satisfies InboxRecord)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('Impossibile salvare il file condiviso'))
      tx.onabort = () => reject(tx.error || new Error('Salvataggio del file interrotto'))
    })
  } finally { db.close() }
}
export async function consumeSharedFile(): Promise<File | null> {
  const db = await openInbox()
  try {
    return await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      let file: File | null = null
      request.onsuccess = () => {
        const records = (request.result as InboxRecord[]).sort((a, b) => a.createdAt - b.createdAt)
        const first = records[0]
        if (!first) return
        // Consume and clear the entire queue so interrupted/multi-file launches cannot leak
        // an older pending document into a later import.
        for (const record of records) {
          if (typeof record.id === 'number') store.delete(record.id)
        }
        file = new File([first.file], first.name, { type: first.type || first.file.type || 'application/octet-stream', lastModified: first.lastModified || first.createdAt })
      }
      tx.oncomplete = () => resolve(file)
      tx.onerror = () => reject(tx.error || new Error('Impossibile leggere il file condiviso'))
      tx.onabort = () => reject(tx.error || new Error('Lettura del file condiviso interrotta'))
    })
  } finally { db.close() }
}
