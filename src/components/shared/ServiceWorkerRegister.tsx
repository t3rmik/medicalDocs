'use client'

import { useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { storeSharedFile } from '@/lib/sharedFileInbox'
import { getFileSizeError, getMaxImportBytes, isTouchConstrainedDevice } from '@/lib/fileLimits'
import toast from 'react-hot-toast'

type LaunchFileHandle = { getFile: () => Promise<File> }
type LaunchParams = { files?: LaunchFileHandle[] }
type LaunchQueueLike = { setConsumer: (consumer: (params: LaunchParams) => void | Promise<void>) => void }

export function ServiceWorkerRegister() {
  const [isOffline, setIsOffline] = useState(false)
  const [isOfflineNoticeDismissed, setIsOfflineNoticeDismissed] = useState(false)

  useEffect(() => {
    const updateConnectionState = () => {
      const offline = !navigator.onLine
      setIsOffline(offline)
      if (!offline) setIsOfflineNoticeDismissed(false)
    }
    updateConnectionState()
    window.addEventListener('online', updateConnectionState)
    window.addEventListener('offline', updateConnectionState)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/medicaldocs-sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch(() => {
        // The workspace remains usable online through the normal file picker.
      })
    }

    const launchWindow = window as Window & { launchQueue?: LaunchQueueLike }
    launchWindow.launchQueue?.setConsumer(async (params) => {
      const handles = params.files || []
      if (!handles.length) return
      try {
        // The existing import dialog handles one document at a time.
        const file = await handles[0].getFile()
        const maxBytes = getMaxImportBytes(file.name, isTouchConstrainedDevice())
        if (!maxBytes || file.size > maxBytes) {
          toast.error(getFileSizeError(file.name, maxBytes))
          return
        }
        await storeSharedFile(file)
        const multipleFiles = handles.length > 1 ? '&multipleFiles=1' : ''
        window.location.assign('/?shared=1' + multipleFiles)
      } catch { window.location.assign('/?shareFailed=handoff') }
    })

    return () => {
      window.removeEventListener('online', updateConnectionState)
      window.removeEventListener('offline', updateConnectionState)
    }
  }, [])

  if (!isOffline) return null

  if (isOfflineNoticeDismissed) {
    return (
      <button
        type="button"
        data-md-offline-compact="true"
        onClick={() => setIsOfflineNoticeDismissed(false)}
        aria-label="Mostra avviso modalità offline"
        title="Modalità offline — mostra dettagli"
        className="fixed right-0 top-[44%] z-[200] flex h-14 w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-amber-400/50 bg-[#13252c] text-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:bg-[#203941] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-300"
      >
        <WifiOff className="h-5 w-5" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div
      data-md-offline-banner="true"
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[200] mx-auto flex max-h-[min(34vh,18rem)] max-w-xl items-start gap-3 overflow-y-auto rounded-xl border border-amber-400/40 bg-[#13252c] px-4 py-3 text-sm text-[#f8ebc7] shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
    >
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-3">
          <strong className="block font-semibold text-[#fff1c7]">Modalità offline</strong>
          <button
            type="button"
            data-md-offline-dismiss="true"
            onClick={() => setIsOfflineNoticeDismissed(true)}
            aria-label="Chiudi avviso offline"
            title="Chiudi avviso"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#35505a] bg-[#182c34] text-[#e1ecee] transition hover:border-amber-300/70 hover:bg-[#203941] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p>
          I documenti e le modifiche continuano a essere salvati su questo dispositivo. AI Studio e le esportazioni che usano il server richiedono una connessione Internet.
        </p>
      </div>
    </div>
  )
}
