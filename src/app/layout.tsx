import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { LoveMessages } from '@/components/shared/LoveMessages'
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'MedicalDocs Pro',
  description: 'Editor di documenti e appunti di studio per la laurea',
  icons: { icon: '/medicaldocs-mark.svg' },
  manifest: '/manifest.webmanifest',
  applicationName: 'MedicalDocs Pro',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MedicalDocs Pro' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        {children}
        <ServiceWorkerRegister />
        <Toaster position="bottom-right" />
        <LoveMessages />
      </body>
    </html>
  )
}