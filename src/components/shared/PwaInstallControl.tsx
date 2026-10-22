'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MedicalDocsDownload as Download } from '@/components/icons/MedicalDocsIcons'

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform?: string }
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<InstallChoice> }

export function PwaInstallControl() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)').matches
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(displayMode || iosStandalone)
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); toast.success('MedicalDocs è stato aggiunto alla schermata Home.') }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const install = async () => {
    if (!installPrompt) {
      toast('Per creare l’icona: in Chrome apri il menu ⋮ e scegli “Installa app” o “Aggiungi a schermata Home”.', { duration: 9000 })
      return
    }
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallPrompt(null)
      if (choice.outcome === 'accepted') setInstalled(true)
    } catch { toast.error('Installazione non disponibile in questo momento. Usa il menu del browser.') }
  }
  if (installed) return null
  return <button type="button" data-md-install-app="true" onClick={install}
    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
    aria-label="Installa MedicalDocs sulla schermata Home del dispositivo" title="Aggiungi MedicalDocs alla schermata Home">
    <Download className="h-4 w-4" /><span>Installa app</span>
  </button>
}
