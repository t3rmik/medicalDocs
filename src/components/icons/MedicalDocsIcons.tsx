'use client'

import type { ReactNode } from 'react'

export type MedicalDocsIconName =
  | 'library' | 'favorite' | 'outline' | 'spark' | 'document'
  | 'pdf' | 'pen' | 'scan' | 'upload' | 'export' | 'page'
  | 'search' | 'bookmark' | 'table' | 'check'

interface MedicalDocsIconProps {
  name: MedicalDocsIconName
  size?: number
  className?: string
  strokeWidth?: number
}

/** Iconografia MedicalDocs: tracciati SVG proprietari, coerenti e disegnati per questa app. */
export function MedicalDocsIcon({
  name, size = 20, className, strokeWidth = 1.8,
}: MedicalDocsIconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  let drawing: ReactNode
  switch (name) {
    case 'library':
      drawing = <g {...common}>
        <path d="M4.5 7.5 12 4l7.5 3.5v12L12 23l-7.5-3.5z" />
        <path d="M12 4v19M4.5 7.5 12 11l7.5-3.5" />
        <path d="M8 9.2v8.4M16 9.2v8.4" opacity=".65" />
      </g>
      break
    case 'favorite':
      drawing = <g {...common}>
        <path d="M12 21.3 4.8 14.7C.3 10.4 6.4 3.3 12 8.5c5.6-5.2 11.7 1.9 7.2 6.2z" />
        <path d="m19.7 3.1.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" strokeWidth="1.35" />
      </g>
      break
    case 'outline':
      drawing = <g {...common}>
        <path d="M8 5.5h12M8 12h12M8 18.5h8" />
        <path d="M4.5 4h1v3h-1zM4.5 10.5h1v3h-1zM4.5 17h1v3h-1z" fill="currentColor" stroke="none" />
        <path d="M21.5 17.5 23 19l-3 3" strokeWidth="1.5" />
      </g>
      break
    case 'spark':
      drawing = <g {...common}>
        <path d="m12 2.8 2.5 6.7 6.7 2.5-6.7 2.5-2.5 6.7-2.5-6.7-6.7-2.5 6.7-2.5z" />
        <path d="m20.5 3.5.9 2.2 2.1.8-2.1.9-.9 2.1-.8-2.1-2.2-.9 2.2-.8z" strokeWidth="1.4" />
      </g>
      break
    case 'document':
      drawing = <g {...common}>
        <path d="M6 3.5h8l5 5v12A2.5 2.5 0 0 1 16.5 23h-10A2.5 2.5 0 0 1 4 20.5v-14A3 3 0 0 1 6 3.5Z" />
        <path d="M14 3.8v5h5M8 13h7M8 17h7" />
      </g>
      break
    case 'pdf':
      drawing = <g {...common}>
        <path d="M6 3.5h8l5 5v12A2.5 2.5 0 0 1 16.5 23h-10A2.5 2.5 0 0 1 4 20.5v-14A3 3 0 0 1 6 3.5Z" />
        <path d="M14 3.8v5h5M7 14.2h10M7 17h7" />
      </g>
      break
    case 'pen':
      drawing = <g {...common}>
        <path d="m4 18.8-.9 4.1 4.1-.9L21 8.2a2.7 2.7 0 0 0-3.8-3.8z" />
        <path d="m14.8 6.8 3.8 3.8M3 14.5h6M2.5 10.5h4" strokeWidth="1.45" />
      </g>
      break
    case 'scan':
      drawing = <g {...common}>
        <path d="M8 3.5H5A2.5 2.5 0 0 0 2.5 6v3M16 3.5h3A2.5 2.5 0 0 1 21.5 6v3M2.5 16v3A2.5 2.5 0 0 0 5 21.5h3M21.5 16v3a2.5 2.5 0 0 1-2.5 2.5h-3" />
        <path d="M6.5 10h11M6.5 13h8M6.5 16h6" />
      </g>
      break
    case 'upload':
      drawing = <g {...common}>
        <path d="M5 18.5v2A2.5 2.5 0 0 0 7.5 23h9a2.5 2.5 0 0 0 2.5-2.5v-2" />
        <path d="M12 17V3.5m-5 5 5-5 5 5M4.5 14.5h4M15.5 14.5h4" />
      </g>
      break
    case 'export':
      drawing = <g {...common}>
        <path d="M6 4H4.5A2.5 2.5 0 0 0 2 6.5v13A2.5 2.5 0 0 0 4.5 22h10A2.5 2.5 0 0 0 17 19.5V18" />
        <path d="M13 3h8v8M21 3l-9.5 9.5" />
      </g>
      break
    case 'page':
      drawing = <g {...common}>
        <rect x="4" y="2.8" width="16" height="21" rx="2.2" />
        <path d="M7.5 8h9M7.5 12h9M7.5 16h5M16.5 18.5h3" />
      </g>
      break
    case 'search':
      drawing = <g {...common}>
        <circle cx="10.5" cy="10.5" r="6.8" />
        <path d="m15.5 15.5 5.2 5.2M8 10.5h5" strokeWidth="1.6" />
      </g>
      break
    case 'bookmark':
      drawing = <g {...common}>
        <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V23l-6-4-6 4z" />
        <path d="M9 7h6" strokeWidth="1.4" />
      </g>
      break
    case 'table':
      drawing = <g {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3.5 9.5h17M9 4.5v15M15 9.5v10" />
      </g>
      break
    case 'check':
      drawing = <g {...common}>
        <circle cx="12" cy="12" r="9.1" />
        <path d="m7.5 12.2 3 3 6.2-6.4" strokeWidth="2.3" />
      </g>
      break
  }

  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" className={className} fill="none">{drawing}</svg>
}

export function MedicalDocsMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 52 52" className={className}>
      <rect x="1" y="1" width="50" height="50" rx="15" fill="#073642" />
      <path d="M11 13.5c5.5-2 10.2-1.1 15 2.2v23.1c-4.6-3.4-9.5-4.5-15-2.3z" fill="#f7fffe" />
      <path d="M41 13.5c-5.5-2-10.2-1.1-15 2.2v23.1c4.6-3.4 9.5-4.5 15-2.3z" fill="#c4f7ee" />
      <path d="M26 15.7v23.1" stroke="#0b6872" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 21.5v9.2m4-7.7v10.2M33 21.5v9.2m4-7.7v10.2" stroke="#83cfc7" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M33.5 5.5h8v8M41.5 5.5l-9 9" stroke="#5eead4" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="40" r="3.2" fill="#f59e0b" />
    </svg>
  )
}
