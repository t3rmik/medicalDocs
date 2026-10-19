import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { LoveMessages } from '@/components/shared/LoveMessages'

export const metadata: Metadata = {
  title: 'MedicalDocs Pro — Workspace documenti',
  description: 'Uno spazio ordinato per creare, annotare e organizzare documenti e appunti.',
  icons: {
    icon: '/medicaldocs-mark.svg',
    shortcut: '/medicaldocs-mark.svg',
    apple: '/medicaldocs-mark.svg',
  },
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
        <Toaster position="bottom-right" />
        <LoveMessages />
      </body>
    </html>
  )
}