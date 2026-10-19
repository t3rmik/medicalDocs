'use client'

import { useState } from 'react'
import { FileText, FolderOpen, FilePlus, Download, Printer, Save, Loader2, ChevronDown } from 'lucide-react'

interface HeaderProps {
  onExport: (format: string) => void;
  loadingFormat: string | null;
  onOpenClick: () => void;
  onNewDocument: () => void;
  activeFileName: string;
  isSaving: boolean;
  onTitleChange: (newTitle: string) => void;
}

export function Header({
  onExport,
  loadingFormat,
  onOpenClick,
  onNewDocument,
  activeFileName,
  isSaving,
  onTitleChange,
}: HeaderProps) {
  const [activeMenu, setActiveMenu] = useState<'file' | 'export' | null>(null)

  const runMenuAction = (action: () => void) => {
    action()
    setActiveMenu(null)
  }

  const menuButtonClass = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'
  const menuPanelClass = 'absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl shadow-slate-900/10'
  const menuItemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600'

  return (
    <header className="relative z-50 flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-900/15">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h1 className="text-base font-bold tracking-tight text-slate-900">MedicalDocs Pro</h1>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-blue-700">STUDIO</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                className={menuButtonClass}
                aria-expanded={activeMenu === 'file'}
              >
                File <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {activeMenu === 'file' && (
                <div className={menuPanelClass}>
                  <button type="button" onClick={() => runMenuAction(onNewDocument)} className={menuItemClass}>
                    <FilePlus className="h-4 w-4 text-blue-600" /> Nuovo documento
                  </button>
                  <button type="button" onClick={() => runMenuAction(onOpenClick)} className={menuItemClass}>
                    <FolderOpen className="h-4 w-4 text-blue-600" /> Apri / importa...
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button type="button" onClick={() => runMenuAction(() => window.print())} className={menuItemClass}>
                    <Printer className="h-4 w-4 text-slate-500" /> Stampa / salva in PDF
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                className={menuButtonClass}
                aria-expanded={activeMenu === 'export'}
              >
                Esporta <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {activeMenu === 'export' && (
                <div className={menuPanelClass}>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Scarica una copia</p>
                  <button type="button" onClick={() => runMenuAction(() => onExport('word'))} className={menuItemClass}>
                    <Download className="h-4 w-4 text-blue-600" /> Documento Word (.docx)
                  </button>
                  <button type="button" onClick={() => runMenuAction(() => onExport('pdf'))} className={menuItemClass}>
                    <Download className="h-4 w-4 text-rose-600" /> Documento PDF
                  </button>
                  <button type="button" onClick={() => runMenuAction(() => onExport('html'))} className={menuItemClass}>
                    <Download className="h-4 w-4 text-slate-500" /> Pagina Web (.html)
                  </button>
                  <button type="button" onClick={() => runMenuAction(() => onExport('md'))} className={menuItemClass}>
                    <Download className="h-4 w-4 text-slate-500" /> Markdown (.md)
                  </button>
                  <button type="button" onClick={() => runMenuAction(() => onExport('txt'))} className={menuItemClass}>
                    <Download className="h-4 w-4 text-slate-500" /> Testo semplice (.txt)
                  </button>
                </div>
              )}
            </div>
            <span className="ml-1 inline-flex items-center gap-1.5 border-l border-slate-200 pl-3 text-xs text-slate-500" role="status" aria-live="polite">
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 text-emerald-600" />
                  Editor pronto
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <label className="min-w-[170px] flex-1 lg:max-w-[260px]">
          <span className="sr-only">Nome documento</span>
          <input
            type="text"
            value={activeFileName}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            placeholder="Nome documento..."
            aria-label="Nome documento"
          />
        </label>
        <button
          type="button"
          onClick={() => onExport('word')}
          disabled={loadingFormat === 'word'}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingFormat === 'word' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>Word</span>
        </button>
        <button
          type="button"
          onClick={() => onExport('pdf')}
          disabled={loadingFormat === 'pdf'}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span>PDF</span>
        </button>
      </div>
    </header>
  )
}
