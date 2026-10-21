import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { LoveMessages } from '@/components/shared/LoveMessages'

export const metadata: Metadata = {
  title: 'MedicalDocs Pro',
  description: 'Editor di documenti e appunti di studio per la laurea',
  icons: { icon: '/medicaldocs-mark.svg' },
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