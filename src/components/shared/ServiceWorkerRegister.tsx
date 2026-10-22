'use client'

import { useEffect } from 'react'
import { storeSharedFile } from '@/lib/sharedFileInbox'
import { getFileSizeError, getMaxImportBytes, isTouchConstrainedDevice } from '@/lib/fileLimits'
import toast from 'react-hot-toast'

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
  }, [])
  return null
}
