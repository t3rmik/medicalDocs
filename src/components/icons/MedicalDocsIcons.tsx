'use client'

import type { ReactNode } from 'react'

export type MedicalDocsIconName =
  | 'library' | 'favorite' | 'outline' | 'spark' | 'document'
  | 'pdf' | 'pen' | 'scan' | 'upload' | 'export' | 'page'
  | 'search' | 'bookmark' | 'table' | 'check' | 'bold' | 'italic' | 'underline' | 'strike'
  | 'subscript' | 'superscript' | 'align-left' | 'align-center' | 'align-right' | 'align-justify'
  | 'list' | 'list-ordered' | 'check-square' | 'palette' | 'highlighter' | 'image' | 'split'
  | 'undo' | 'redo' | 'clear-format' | 'rows' | 'columns' | 'trash' | 'file-upload'
  | 'arrow-up' | 'arrow-down' | 'merge' | 'layers' | 'help' | 'book-open' | 'message'
  | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'download' | 'zoom-in' | 'zoom-out'
  | 'edit' | 'shield-alert' | 'stamp' | 'check-circle' | 'move' | 'type' | 'close'
  | 'copy' | 'folder' | 'folder-open' | 'file-plus' | 'printer' | 'save' | 'loader'
  | 'command' | 'plus' | 'arrow-up-right' | 'alert-circle'

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
    case 'bold':
      drawing = <path {...common} d="M7 4.5h6a3.8 3.8 0 0 1 .9 7.5A4.2 4.2 0 0 1 13 20H7z M7.5 12h5.2M7.5 5v6.8m0 1.2v6.5" strokeWidth="2" />
      break
    case 'italic':
      drawing = <g {...common}><path d="M13 4H19M5 20h6M16 4 8 20" strokeWidth="2" /></g>
      break
    case 'underline':
      drawing = <g {...common}><path d="M7 4.5v6.7a5 5 0 0 0 10 0V4.5M5 20.5h14" strokeWidth="2" /></g>
      break
    case 'strike':
      drawing = <g {...common}><path d="M5 9V7.5A3.5 3.5 0 0 1 8.5 4h7A3.5 3.5 0 0 1 19 7.5M5 15v1.5A3.5 3.5 0 0 0 8.5 20h7a3.5 3.5 0 0 0 3.5-3.5M3 12h18" strokeWidth="1.9" /></g>
      break
    case 'subscript':
      drawing = <g {...common}><path d="m4.5 6 7.5 8m0-8-7.5 8M14 17.5h5.5M19.5 17.5v2.8M19.5 20.3H15" strokeWidth="1.8" /></g>
      break
    case 'superscript':
      drawing = <g {...common}><path d="m4.5 9 7.5 8m0-8-7.5 8M14.5 4.5h5l-5 4h5" strokeWidth="1.8" /></g>
      break
    case 'align-left':
      drawing = <g {...common}><path d="M4 5h15M4 9h10M4 13h15M4 17h8M4 21h12" /></g>
      break
    case 'align-center':
      drawing = <g {...common}><path d="M4 5h16M7 9h10M4 13h16M8 17h8M6 21h12" /></g>
      break
    case 'align-right':
      drawing = <g {...common}><path d="M5 5h15M10 9h10M5 13h15M12 17h8M8 21h12" /></g>
      break
    case 'align-justify':
      drawing = <g {...common}><path d="M4 5h16M4 9h16M4 13h16M4 17h16M4 21h16" /></g>
      break
    case 'list':
      drawing = <g {...common}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r=".8" fill="currentColor"/><circle cx="4.5" cy="12" r=".8" fill="currentColor"/><circle cx="4.5" cy="18" r=".8" fill="currentColor"/></g>
      break
    case 'list-ordered':
      drawing = <g {...common}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 4.5h2v3h-2M3.5 10.5h2l-2 3h2M3.5 17h2v3h-2" strokeWidth="1.4"/></g>
      break
    case 'check-square':
      drawing = <g {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m7.5 12 3 3 6.5-7" strokeWidth="2"/></g>
      break
    case 'palette':
      drawing = <g {...common}><path d="M12 3.2a8.8 8.8 0 0 0 0 17.6h1.4a2.2 2.2 0 0 0 1.2-4.1 1.9 1.9 0 0 1 1-3.5h2.1A3.1 3.1 0 0 0 21 10C20.2 6.1 16.4 3.2 12 3.2Z"/><circle cx="7.5" cy="10" r="1" fill="currentColor"/><circle cx="11" cy="6.9" r="1" fill="currentColor"/><circle cx="15.5" cy="7.4" r="1" fill="currentColor"/></g>
      break
    case 'highlighter':
      drawing = <g {...common}><path d="m4 15.5 9-9 5.5 5.5-9 9H4z"/><path d="m11 8.5 5.5 5.5M4 21h16M18 4l2-2 2 2-2 2z" strokeWidth="1.6"/></g>
      break
    case 'image':
      drawing = <g {...common}><rect x="3" y="4" width="18" height="16" rx="2.2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m4.5 17 5-4 3.2 2.4 2.7-3 4.1 4.6"/></g>
      break
    case 'split':
      drawing = <g {...common}><path d="M12 3v18M4 7h5l3 5-3 5H4M20 7h-5l-3 5 3 5h5" strokeWidth="1.7"/><path d="m6 5-2 2 2 2M18 5l2 2-2 2M6 15l-2 2 2 2M18 15l2 2-2 2" strokeWidth="1.5"/></g>
      break
    case 'undo':
      drawing = <g {...common}><path d="M8 7 3.5 11.5 8 16"/><path d="M4 11.5h9a6.5 6.5 0 0 1 6.5 6.5"/></g>
      break
    case 'redo':
      drawing = <g {...common}><path d="m16 7 4.5 4.5L16 16"/><path d="M20 11.5h-9A6.5 6.5 0 0 0 4.5 18"/></g>
      break
    case 'clear-format':
      drawing = <g {...common}><path d="M4 6h16M7 6l4 5v4M17 6l-3 4M13 18l7-7M13 11l7 7" strokeWidth="1.7"/></g>
      break
    case 'rows':
      drawing = <g {...common}><rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M4 9.3h16M4 14.7h16"/></g>
      break
    case 'columns':
      drawing = <g {...common}><rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M9.2 4.5v15M14.8 4.5v15"/></g>
      break
    case 'trash':
      drawing = <g {...common}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10.5v6M14 10.5v6" strokeWidth="1.7"/></g>
      break
    case 'file-upload':
      drawing = <g {...common}><path d="M6 3.5h8l4 4v5M14 3.8v4h4M4 14.5v5A2.5 2.5 0 0 0 6.5 22h6"/><path d="m17 22 0-8m-3 3 3-3 3 3"/></g>
      break
    case 'arrow-up':
      drawing = <g {...common}><path d="M12 20V4m-6 6 6-6 6 6" strokeWidth="2"/></g>
      break
    case 'arrow-down':
      drawing = <g {...common}><path d="M12 4v16m-6-6 6 6 6-6" strokeWidth="2"/></g>
      break
    case 'merge':
      drawing = <g {...common}><path d="M4 5h5v14H4M20 5h-5v14h5M9 12h6m-3-3 3 3-3 3" strokeWidth="1.7"/></g>
      break
    case 'layers':
      drawing = <g {...common}><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></g>
      break
    case 'help':
      drawing = <g {...common}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.5 1.8c-1.2 1.1-2 1.4-2 3.2M12 17.7v.1" strokeWidth="1.9"/></g>
      break
    case 'book-open':
      drawing = <g {...common}><path d="M12 7c-2.3-2.3-5.3-3-8.5-2v14c3.2-1 6.2-.3 8.5 2 2.3-2.3 5.3-3 8.5-2V5c-3.2-1-6.2-.3-8.5 2Z"/><path d="M12 7v14M6.5 9.2h2.7M15.5 9.2h2.7M6.5 12.5h2.7M15.5 12.5h2.7"/></g>
      break
    case 'message':
      drawing = <g {...common}><path d="M4 4.5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-5 3v-3H4a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h7"/></g>
      break
    case 'chevron-down':
      drawing = <path {...common} d="m6 9 6 6 6-6" strokeWidth="2"/>
      break
    case 'chevron-left':
      drawing = <path {...common} d="m15 5-7 7 7 7" strokeWidth="2"/>
      break
    case 'chevron-right':
      drawing = <path {...common} d="m9 5 7 7-7 7" strokeWidth="2"/>
      break
    case 'download':
      drawing = <g {...common}><path d="M12 3.5v11m-4.5-4.5 4.5 4.5 4.5-4.5M4 17.5v2A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5v-2"/></g>
      break
    case 'zoom-in':
      drawing = <g {...common}><circle cx="10.5" cy="10.5" r="6.7"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/></g>
      break
    case 'zoom-out':
      drawing = <g {...common}><circle cx="10.5" cy="10.5" r="6.7"/><path d="m15.5 15.5 5 5M7.5 10.5h6"/></g>
      break
    case 'edit':
      drawing = <g {...common}><path d="m4 17.5-.8 3.3 3.3-.8L20 6.5a2.2 2.2 0 0 0-3.1-3.1zM14.9 5.4 18 8.5M4 12h5"/></g>
      break
    case 'shield-alert':
      drawing = <g {...common}><path d="M12 3 20 6v5.5c0 4.3-3.3 7.9-8 9.8-4.7-1.9-8-5.5-8-9.8V6z"/><path d="M12 7.5v5M12 16.2v.1" strokeWidth="2"/></g>
      break
    case 'stamp':
      drawing = <g {...common}><path d="M8 10a4 4 0 1 1 8 0c0 2.2 1 3.4 2 4.5v2H6v-2c1-1.1 2-2.3 2-4.5ZM4 20h16v2H4z"/><path d="m12 7 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="currentColor" stroke="none"/></g>
      break
    case 'check-circle':
      drawing = <g {...common}><circle cx="12" cy="12" r="9"/><path d="m7.5 12.2 3 3 6.2-6.4" strokeWidth="2.2"/></g>
      break
    case 'move':
      drawing = <g {...common}><path d="M12 3v18m-3-15 3-3 3 3M9 18l3 3 3-3M3 12h18m-15-3-3 3 3 3m12-6 3 3-3 3" strokeWidth="1.6"/></g>
      break
    case 'type':
      drawing = <g {...common}><path d="M4 5h16M12 5v15M8 20h8" strokeWidth="2"/><path d="M7 9h10" opacity=".6"/></g>
      break
    case 'close':
      drawing = <path {...common} d="m6 6 12 12M18 6 6 18" strokeWidth="2"/>
      break
    case 'copy':
      drawing = <g {...common}><rect x="8" y="7" width="12" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/></g>
      break
    case 'folder':
      drawing = <path {...common} d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>
      break
    case 'folder-open':
      drawing = <g {...common}><path d="M3.5 7.5V6.8A2.3 2.3 0 0 1 5.8 4.5h3.8l2 2h6.6A2.3 2.3 0 0 1 20.5 8.8"/><path d="M3 10h18l-2.1 8.2a2.5 2.5 0 0 1-2.4 1.8H5.5a2.5 2.5 0 0 1-2.4-3z"/></g>
      break
    case 'file-plus':
      drawing = <g {...common}><path d="M6 3.5h8l4 4v13A2.5 2.5 0 0 1 15.5 23h-9A2.5 2.5 0 0 1 4 20.5v-14A3 3 0 0 1 6 3.5Z"/><path d="M14 3.8v4h4M12 12v6M9 15h6"/></g>
      break
    case 'printer':
      drawing = <g {...common}><path d="M7 8V3.5h10V8M7 17H4.5A2.5 2.5 0 0 1 2 14.5v-4A2.5 2.5 0 0 1 4.5 8h15a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H17"/><path d="M7 14h10v7H7zM18 11h1"/></g>
      break
    case 'save':
      drawing = <g {...common}><path d="M4 3.5h13l3 3v14A2.5 2.5 0 0 1 17.5 23h-11A2.5 2.5 0 0 1 4 20.5z"/><path d="M8 3.8v5h8v-5M8 22v-8h8v8"/></g>
      break
    case 'loader':
      drawing = <g {...common}><path d="M12 3a9 9 0 1 1-8.2 5.3" strokeWidth="2.5"/><path d="M3.5 3.5v5h5" strokeWidth="2.5"/></g>
      break
    case 'command':
      drawing = <g {...common}><path d="M8 8V6a2.5 2.5 0 1 0-2.5 2.5H8v5H5.5A2.5 2.5 0 1 0 8 16v-3h8v3a2.5 2.5 0 1 0 2.5-2.5H16V8h2.5A2.5 2.5 0 1 0 16 5.5V8z"/></g>
      break
    case 'plus':
      drawing = <path {...common} d="M12 4v16M4 12h16" strokeWidth="2"/>
      break
    case 'arrow-up-right':
      drawing = <g {...common}><path d="M7 17 18 6M9 6h9v9" strokeWidth="2"/></g>
      break
    case 'alert-circle':
      drawing = <g {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.1" strokeWidth="2"/></g>
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


// Comodità per le barre strumenti: wrappers originali, senza dipendenze da icon pack esterni.
export const MedicalDocsBold = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="bold" {...props} />;
export const MedicalDocsItalic = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="italic" {...props} />;
export const MedicalDocsUnderlineIcon = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="underline" {...props} />;
export const MedicalDocsStrikethrough = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="strike" {...props} />;
export const MedicalDocsSubscript = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="subscript" {...props} />;
export const MedicalDocsSuperscript = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="superscript" {...props} />;
export const MedicalDocsAlignLeft = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="align-left" {...props} />;
export const MedicalDocsAlignCenter = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="align-center" {...props} />;
export const MedicalDocsAlignRight = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="align-right" {...props} />;
export const MedicalDocsAlignJustify = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="align-justify" {...props} />;
export const MedicalDocsList = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="list" {...props} />;
export const MedicalDocsListOrdered = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="list-ordered" {...props} />;
export const MedicalDocsCheckSquare = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="check-square" {...props} />;
export const MedicalDocsPalette = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="palette" {...props} />;
export const MedicalDocsHighlighter = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="highlighter" {...props} />;
export const MedicalDocsTableIcon = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="table" {...props} />;
export const MedicalDocsImageIcon = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="image" {...props} />;
export const MedicalDocsSplitSquareHorizontal = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="split" {...props} />;
export const MedicalDocsUndo = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="undo" {...props} />;
export const MedicalDocsRedo = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="redo" {...props} />;
export const MedicalDocsRemoveFormatting = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="clear-format" {...props} />;
export const MedicalDocsRows = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="rows" {...props} />;
export const MedicalDocsColumns = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="columns" {...props} />;
export const MedicalDocsTrash2 = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="trash" {...props} />;
export const MedicalDocsFileUp = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="file-upload" {...props} />;
export const MedicalDocsArrowUp = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="arrow-up" {...props} />;
export const MedicalDocsArrowDown = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="arrow-down" {...props} />;
export const MedicalDocsMerge = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="merge" {...props} />;
export const MedicalDocsLayers = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="layers" {...props} />;
export const MedicalDocsHelp = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="help" {...props} />;
export const MedicalDocsBookOpen = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="book-open" {...props} />;
export const MedicalDocsMessage = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="message" {...props} />;
export const MedicalDocsChevronDown = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="chevron-down" {...props} />;
export const MedicalDocsChevronLeft = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="chevron-left" {...props} />;
export const MedicalDocsChevronRight = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="chevron-right" {...props} />;
export const MedicalDocsDownload = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="download" {...props} />;
export const MedicalDocsZoomIn = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="zoom-in" {...props} />;
export const MedicalDocsZoomOut = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="zoom-out" {...props} />;
export const MedicalDocsEdit = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="edit" {...props} />;
export const MedicalDocsShieldAlert = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="shield-alert" {...props} />;
export const MedicalDocsStamp = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="stamp" {...props} />;
export const MedicalDocsCheckCircle = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="check-circle" {...props} />;
export const MedicalDocsMove = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="move" {...props} />;
export const MedicalDocsType = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="type" {...props} />;
export const MedicalDocsClose = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="close" {...props} />;
export const MedicalDocsCopy = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="copy" {...props} />;
export const MedicalDocsFolder = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="folder" {...props} />;
export const MedicalDocsFolderOpen = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="folder-open" {...props} />;
export const MedicalDocsFilePlus = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="file-plus" {...props} />;
export const MedicalDocsPrinter = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="printer" {...props} />;
export const MedicalDocsSave = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="save" {...props} />;
export const MedicalDocsLoader = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="loader" {...props} />;
export const MedicalDocsCommand = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="command" {...props} />;
export const MedicalDocsPlus = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="plus" {...props} />;
export const MedicalDocsArrowUpRight = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="arrow-up-right" {...props} />;
export const MedicalDocsAlertCircle = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="alert-circle" {...props} />;
export const MedicalDocsSpark = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="spark" {...props} />;
export const MedicalDocsDocument = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="document" {...props} />;
export const MedicalDocsSearch = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="search" {...props} />;
export const MedicalDocsFavorite = (props: Omit<MedicalDocsIconProps, 'name'>) => <MedicalDocsIcon name="favorite" {...props} />;
