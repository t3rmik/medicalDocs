'use client'

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import Image from 'next/image'
import {
  FolderOpen,
  FilePlus,
  Download,
  Printer,
  Save,
  Loader2,
  ChevronDown,
  Search,
  Command as CommandIcon,
  X,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

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
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const commandInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsPaletteOpen((isOpen) => !isOpen)
        setCommandQuery('')
        setSelectedCommandIndex(0)
        setActiveMenu(null)
      }

      if (event.key === 'Escape') {
        setIsPaletteOpen(false)
        setActiveMenu(null)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const runMenuAction = (action: () => void) => {
    action()
    setActiveMenu(null)
  }

  const executeCommand = (action: () => void) => {
    action()
    setIsPaletteOpen(false)
    setCommandQuery('')
    setSelectedCommandIndex(0)
    setActiveMenu(null)
  }

  const menuButtonClass = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600'
  const menuPanelClass = 'absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl shadow-slate-900/10'
  const menuItemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600'

  const commands = [
    { id: 'new', label: 'Nuovo documento', description: 'Inizia con un documento vuoto', section: 'Documento', keywords: 'crea nuovo file', icon: FilePlus, action: onNewDocument },
    { id: 'open', label: 'Apri o importa', description: 'Carica un file Word, PDF, TXT o HTML', section: 'Documento', keywords: 'carica importa apri upload', icon: FolderOpen, action: onOpenClick },
    { id: 'print', label: 'Stampa o salva in PDF', description: 'Apri la finestra di stampa del browser', section: 'Documento', keywords: 'stampa print pdf', icon: Printer, action: () => window.print() },
    { id: 'word', label: 'Esporta in Word', description: 'Scarica una copia modificabile (.docx)', section: 'Esporta', keywords: 'docx microsoft word scarica', icon: Download, action: () => onExport('word') },
    { id: 'pdf', label: 'Esporta in PDF', description: 'Crea una copia pronta per la condivisione', section: 'Esporta', keywords: 'pdf scarica stampa', icon: Download, action: () => onExport('pdf') },
    { id: 'html', label: 'Esporta in HTML', description: 'Salva una pagina web', section: 'Esporta', keywords: 'html web sito', icon: Download, action: () => onExport('html') },
    { id: 'markdown', label: 'Esporta in Markdown', description: 'Salva il testo in formato Markdown', section: 'Esporta', keywords: 'markdown md testo', icon: Download, action: () => onExport('md') },
    { id: 'text', label: 'Esporta testo semplice', description: 'Scarica un file TXT', section: 'Esporta', keywords: 'txt plain text', icon: Download, action: () => onExport('txt') },
  ]

  const normalizedQuery = commandQuery.trim().toLocaleLowerCase('it')
  const filteredCommands = commands.filter((command) => {
    const searchable = (command.label + ' ' + command.description + ' ' + command.section + ' ' + command.keywords).toLocaleLowerCase('it')
    return searchable.includes(normalizedQuery)
  })

  const handleCommandKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedCommandIndex((index) => Math.min(index + 1, filteredCommands.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedCommandIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const command = filteredCommands[selectedCommandIndex]
      if (command) executeCommand(command.action)
    }
  }

  const openCommandPalette = () => {
    setActiveMenu(null)
    setCommandQuery('')
    setSelectedCommandIndex(0)
    setIsPaletteOpen(true)
  }

  return (
    <>
      <header className="relative z-50 flex flex-col gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl print:hidden sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <Image src="/medicaldocs-mark.svg" alt="Logo MedicalDocs" width={48} height={48} priority className="h-12 w-12 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-base font-bold tracking-tight text-slate-950"><span>Medical</span><span className="text-teal-600">Docs</span><span className="ml-1 text-sm font-semibold text-slate-500">Pro</span></h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-teal-700">
                <Sparkles className="h-3 w-3" />
                WORKSPACE
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                  className={menuButtonClass}
                  aria-expanded={activeMenu === 'file'}
                  aria-haspopup="menu"
                >
                  File <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {activeMenu === 'file' && (
                  <div className={menuPanelClass} role="menu">
                    <button type="button" role="menuitem" onClick={() => runMenuAction(onNewDocument)} className={menuItemClass}>
                      <FilePlus className="h-4 w-4 text-teal-600" /> Nuovo documento
                    </button>
                    <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenClick)} className={menuItemClass}>
                      <FolderOpen className="h-4 w-4 text-teal-600" /> Apri / importa...
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button type="button" role="menuitem" onClick={() => runMenuAction(() => window.print())} className={menuItemClass}>
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
                  aria-haspopup="menu"
                >
                  Esporta <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {activeMenu === 'export' && (
                  <div className={menuPanelClass} role="menu">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Scarica una copia</p>
                    <button type="button" role="menuitem" onClick={() => runMenuAction(() => onExport('word'))} className={menuItemClass}>
                      <Download className="h-4 w-4 text-teal-600" /> Documento Word (.docx)
                    </button>
                    <button type="button" role="menuitem" onClick={() => runMenuAction(() => onExport('pdf'))} className={menuItemClass}>
                      <Download className="h-4 w-4 text-rose-600" /> Documento PDF
                    </button>
                    <button type="button" role="menuitem" onClick={() => runMenuAction(() => onExport('html'))} className={menuItemClass}>
                      <Download className="h-4 w-4 text-slate-500" /> Pagina Web (.html)
                    </button>
                    <button type="button" role="menuitem" onClick={() => runMenuAction(() => onExport('md'))} className={menuItemClass}>
                      <Download className="h-4 w-4 text-slate-500" /> Markdown (.md)
                    </button>
                    <button type="button" role="menuitem" onClick={() => runMenuAction(() => onExport('txt'))} className={menuItemClass}>
                      <Download className="h-4 w-4 text-slate-500" /> Testo semplice (.txt)
                    </button>
                  </div>
                )}
              </div>
              <span className="ml-1 inline-flex items-center gap-1.5 border-l border-slate-200 pl-3 text-xs text-slate-500" role="status" aria-live="polite">
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
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
          <button
            type="button"
            onClick={openCommandPalette}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/70 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            aria-haspopup="dialog"
            aria-label="Apri il centro comandi"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <span className="hidden xl:inline">Cerca un comando</span>
            <kbd className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              <CommandIcon className="h-3 w-3" /> K
            </kbd>
          </button>
          <label className="min-w-[170px] flex-1 lg:max-w-[260px]">
            <span className="sr-only">Nome documento</span>
            <input
              type="text"
              value={activeFileName}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
              placeholder="Nome documento..."
              aria-label="Nome documento"
            />
          </label>
          <button
            type="button"
            onClick={() => onExport('word')}
            disabled={loadingFormat === 'word'}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-900/10 transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingFormat === 'word' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>Word</span>
          </button>
          <button
            type="button"
            onClick={() => onExport('pdf')}
            disabled={loadingFormat === 'pdf'}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>PDF</span>
          </button>
        </div>
      </header>

      {isPaletteOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 px-4 pb-8 pt-[12vh] backdrop-blur-sm sm:pt-[16vh]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPaletteOpen(false)
          }}
        >
          <section
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 ring-1 ring-slate-900/5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Search className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="command-palette-title" className="text-sm font-semibold text-slate-900">Centro comandi</h2>
                <p className="mt-0.5 text-xs text-slate-500">Cerca un'azione senza interrompere il lavoro.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Chiudi centro comandi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <label className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-2.5 transition focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
                <Search className="h-4 w-4 shrink-0 text-teal-600" />
                <input
                  ref={commandInputRef}
                  autoFocus
                  type="text"
                  role="combobox"
                  aria-label="Cerca tra i comandi"
                  aria-expanded="true"
                  aria-controls="medicaldocs-command-list"
                  aria-autocomplete="list"
                  value={commandQuery}
                  onChange={(event) => {
                    setCommandQuery(event.target.value)
                    setSelectedCommandIndex(0)
                  }}
                  onKeyDown={handleCommandKeyDown}
                  placeholder="Cerca un'azione, ad esempio esporta PDF..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">ESC</kbd>
              </label>
            </div>

            <div id="medicaldocs-command-list" role="listbox" aria-label="Comandi disponibili" className="max-h-[min(52vh,420px)] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-9 text-center">
                  <Search className="mx-auto h-5 w-5 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">Nessun comando trovato</p>
                  <p className="mt-1 text-xs text-slate-500">Prova con parole come “nuovo”, “importa” o “PDF”.</p>
                </div>
              ) : (
                filteredCommands.map((command, index) => {
                  const Icon = command.icon
                  const previousCommand = filteredCommands[index - 1]
                  const showSection = !previousCommand || previousCommand.section !== command.section

                  return (
                    <div key={command.id}>
                      {showSection && (
                        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          {command.section}
                        </p>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={selectedCommandIndex === index}
                        onMouseEnter={() => setSelectedCommandIndex(index)}
                        onClick={() => executeCommand(command.action)}
                        className={'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ' + (selectedCommandIndex === index ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50')}
                      >
                        <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ' + (selectedCommandIndex === index ? 'bg-white text-teal-700 shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-white')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{command.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{command.description}</span>
                        </span>
                        <ArrowUpRight className={'h-4 w-4 shrink-0 transition ' + (selectedCommandIndex === index ? 'text-teal-600' : 'text-slate-300')} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-[11px] text-slate-500">
              <span>MedicalDocs Pro <span className="text-slate-300">/</span> Accesso rapido</span>
              <span className="flex items-center gap-3">
                <span><kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">↑</kbd> <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">↓</kbd> naviga</span>
                <span><kbd className="rounded border border-slate-200 bg-white px-1 py-0.5">↵</kbd> esegui</span>
              </span>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
