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
  other: { 'mobile-web-app-capable': 'yes' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MedicalDocs Pro' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
        <Toaster position="bottom-right" />
        <LoveMessages />
      </body>
    </html>
  )
}