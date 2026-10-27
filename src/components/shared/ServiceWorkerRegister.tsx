'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { storeSharedFile } from '@/lib/sharedFileInbox'
import { getFileSizeError, getMaxImportBytes, isTouchConstrainedDevice } from '@/lib/fileLimits'
import toast from 'react-hot-toast'

type LaunchFileHandle = { getFile: () => Promise<File> }
type LaunchParams = { files?: LaunchFileHandle[] }
type LaunchQueueLike = { setConsumer: (consumer: (params: LaunchParams) => void | Promise<void>) => void }

export function ServiceWorkerRegister() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const updateConnectionState = () => setIsOffline(!navigator.onLine)
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

  return (
    <div
      data-md-offline-banner="true"
      role="status"
      aria-live="polite"
      className="fixed bottom-16 left-3 right-3 z-[200] mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-amber-400/40 bg-[#13252c] px-4 py-3 text-sm text-[#f8ebc7] shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
    >
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
      <span>
        <strong className="block font-semibold text-[#fff1c7]">Modalità offline</strong>
        I documenti e le modifiche continuano a essere salvati su questo dispositivo. AI Studio e le esportazioni che usano il server richiedono una connessione Internet.
      </span>
    </div>
  )
}
