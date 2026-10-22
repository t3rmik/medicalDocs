'use client'

import { useEffect } from 'react'
import { storeSharedFile } from '@/lib/sharedFileInbox'

type LaunchFileHandle = { getFile: () => Promise<File> }
type LaunchParams = { files?: LaunchFileHandle[] }
type LaunchQueueLike = { setConsumer: (consumer: (params: LaunchParams) => void | Promise<void>) => void }

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/medicaldocs-sw.js', { scope: '/' }).catch(() => {
        // The app remains usable through its normal file picker without service workers.
      })
    }
    const launchWindow = window as Window & { launchQueue?: LaunchQueueLike }
    launchWindow.launchQueue?.setConsumer(async (params) => {
      const handles = params.files || []
      if (!handles.length) return
      try {
        for (const handle of handles) await storeSharedFile(await handle.getFile())
        window.location.assign('/?shared=1')
      } catch { window.location.assign('/?shareFailed=handoff') }
    })
  }, [])
  return null
}
