'use client'

import { Editor } from '@tiptap/react'
import { MedicalDocsZoomIn as ZoomIn, MedicalDocsZoomOut as ZoomOut, MedicalDocsCheckCircle as CheckCircle2, MedicalDocsLoader as Loader2 } from '@/components/icons/MedicalDocsIcons'

interface StatusBarProps {
  editor: Editor | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isSaving: boolean;
}

export function StatusBar({ editor, zoom, onZoomChange, isSaving }: StatusBarProps) {
  if (!editor) return null

  const text = editor.getText()
  const words = text.split(/\s+/).filter((word) => word.length > 0).length
  const chars = text.length
  const pageCount = Math.max(1, editor.view.dom.querySelector('#pages')?.querySelectorAll('.rm-page-break').length || 1)

  return (
    <div data-md-statusbar="true" className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200/90 bg-white/95 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur sm:px-5 print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span>{words} parole</span>
        <span>{chars} caratteri</span>
        <span>{pageCount} {pageCount === 1 ? 'pagina' : 'pagine'}</span>
        <span className="inline-flex items-center gap-1.5 border-l border-slate-200 pl-3" role="status" aria-live="polite">
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
              <span className="text-teal-700">Salvataggio in corso</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Pronto · salvataggio automatico attivo</span>
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline">Italiano</span>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(60, zoom - 10))}
            disabled={zoom <= 60}
            className="rounded-lg p-1.5 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Riduci zoom editor"
            title="Riduci zoom"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-10 text-center font-medium text-slate-700">{zoom}%</span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(160, zoom + 10))}
            disabled={zoom >= 160}
            className="rounded-lg p-1.5 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Aumenta zoom editor"
            title="Aumenta zoom"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
