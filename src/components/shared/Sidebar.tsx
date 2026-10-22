'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { StudyChatPanel } from '@/components/ai/StudyChatPanel'
import {
  MedicalDocsIcon,
  MedicalDocsMark,
  MedicalDocsDocument as FileText,
  MedicalDocsTrash2 as Trash2,
  MedicalDocsCopy as Copy,
  MedicalDocsSearch as Search,
  MedicalDocsFavorite as Star,
  MedicalDocsFolder as Folder,
  MedicalDocsChevronDown as ChevronDown,
  MedicalDocsPlus as Plus,
  MedicalDocsClose as X,
} from '@/components/icons/MedicalDocsIcons'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MedicalDocument } from '@/lib/db'

interface SidebarProps {
  onLoadDocument: (doc: MedicalDocument) => void;
  onDuplicateDocument: (doc: MedicalDocument) => void;
  onUpdateDocumentMetadata: (docId: number, updates: Partial<Pick<MedicalDocument, 'favorite' | 'folder'>>) => void;
  activeDocId?: number;
  currentHtml?: string;
}

const DEFAULT_FOLDERS = ['Generale', 'Biologia', 'Chimica', 'Personale'] as const
const CUSTOM_FOLDERS_KEY = 'medicaldocs-custom-folders-v1'
type SidebarTab = 'docs' | 'favorites' | 'outline' | 'chat' | null

function searchableDocumentText(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').toLocaleLowerCase('it')
}

function normaliseFolder(value?: string): string {
  const folder = (value || 'Generale').trim()
  // Legacy categories stay accessible without continuing to show the retired labels.
  if (['Studio', 'Clinica', 'Università', 'Universita'].includes(folder)) return 'Generale'
  return folder || 'Generale'
}

export function Sidebar({ onLoadDocument, onDuplicateDocument, onUpdateDocumentMetadata, activeDocId, currentHtml }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [folderFilter, setFolderFilter] = useState<string>('Tutte le cartelle')
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const allDocs = useLiveQuery(() => db.documents.orderBy('updatedAt').reverse().toArray())

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_FOLDERS_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        const clean = parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().replace(/\s+/g, ' ').slice(0, 32))
          .filter((item) => item && !DEFAULT_FOLDERS.some((folder) => folder.toLocaleLowerCase('it') === item.toLocaleLowerCase('it')))
        setCustomFolders(Array.from(new Set(clean)))
      }
    } catch {
      // The archive still works if browser storage is unavailable.
    }
  }, [])

  const folders = useMemo(() => {
    const fromDocuments = (allDocs || []).map((doc) => normaliseFolder(doc.folder))
    const extras = [...customFolders, ...fromDocuments]
      .filter((folder) => !DEFAULT_FOLDERS.includes(folder as (typeof DEFAULT_FOLDERS)[number]))
      .filter((folder) => folder !== 'Studio' && folder !== 'Clinica' && folder !== 'Università' && folder !== 'Universita')
    return [...DEFAULT_FOLDERS, ...Array.from(new Set(extras))]
  }, [customFolders, allDocs])

  const createFolder = () => {
    const name = newFolderName.trim().replace(/\s+/g, ' ').slice(0, 32)
    if (!name) return
    const existing = folders.find((folder) => folder.toLocaleLowerCase('it') === name.toLocaleLowerCase('it'))
    if (existing) {
      setFolderFilter(existing)
      setNewFolderName('')
      return
    }
    const next = [...customFolders, name]
    setCustomFolders(next)
    setFolderFilter(name)
    setNewFolderName('')
    try { window.localStorage.setItem(CUSTOM_FOLDERS_KEY, JSON.stringify(next)) } catch {
      // The new folder can still be used for this session.
    }
  }
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const query = deferredSearchTerm.trim().toLocaleLowerCase('it')
  const filteredDocs = useMemo(() => allDocs?.filter((doc) => {
    const matchesQuery = !query || doc.title.toLocaleLowerCase('it').includes(query) || searchableDocumentText(doc.content).includes(query)
    const matchesTab = activeTab !== 'favorites' || Boolean(doc.favorite)
    const matchesFolder = folderFilter === 'Tutte le cartelle' || normaliseFolder(doc.folder) === folderFilter
    return matchesQuery && matchesTab && matchesFolder
  }), [allDocs, query, activeTab, folderFilter])
  const favoriteCount = allDocs?.filter((doc) => doc.favorite).length || 0

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation()
    if (window.confirm('Eliminare definitivamente questo documento?')) {
      try { await db.documents.delete(id) }
      catch { window.alert('Impossibile eliminare il documento.') }
    }
  }

  // Parsing HTML for the outline can be expensive on large notes (especially with embedded images).
  // Defer it so editing stays responsive, and skip it entirely while the outline panel is closed.
  const deferredHtml = useDeferredValue(currentHtml)
  const outline = useMemo(() => {
    if (activeTab !== 'outline' || typeof window === 'undefined' || !deferredHtml) return []
    try {
      const parser = new DOMParser()
      const parsed = parser.parseFromString(deferredHtml, 'text/html')
      return Array.from(parsed.querySelectorAll('h1, h2, h3')).map((heading, index) => ({
        id: index,
        text: heading.textContent || 'Intestazione senza titolo',
        level: Number(heading.tagName.replace('H', '')),
      }))
    } catch { return [] }
  }, [activeTab, deferredHtml])
  const openTab = (tab: Exclude<SidebarTab, null>) => setActiveTab(activeTab === tab ? null : tab)
  const railButtonClass = (selected: boolean) =>
    'relative flex items-center justify-center rounded-xl p-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ' +
    (selected ? 'bg-white/15 text-teal-200 shadow-inner ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/10 hover:text-white')

  return (
    <div data-md-sidebar-root="true" data-md-panel-open={activeTab ? 'true' : 'false'} data-md-sidebar-active={activeTab || 'none'} className="flex min-h-0 shrink-0 print:hidden">
      <aside data-md-sidebar-rail="true" className="z-40 flex w-14 shrink-0 flex-col items-center gap-3 border-r border-[#0d4654] bg-gradient-to-b from-[#092d39] via-[#0b3545] to-[#071f2e] py-4 shadow-xl sm:w-16">
        <div className="md-sidebar-brand mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <MedicalDocsMark size={34} className="h-9 w-9" />
        </div>
        <div className="mb-1 h-px w-7 bg-white/15" />
        <button type="button" data-md-nav-button="true" onClick={() => openTab('docs')} className={railButtonClass(activeTab === 'docs')} title="Tutti i documenti" aria-label="Tutti i documenti" aria-pressed={activeTab === 'docs'}>
          <MedicalDocsIcon name="library" size={22} />
          <span data-md-sidebar-mobile-label="true">Archivio</span>
        </button>
        <button type="button" data-md-nav-button="true" onClick={() => openTab('favorites')} className={railButtonClass(activeTab === 'favorites')} title="Preferiti" aria-label="Preferiti" aria-pressed={activeTab === 'favorites'}>
          <MedicalDocsIcon name="favorite" size={22} />
          <span data-md-sidebar-mobile-label="true">Preferiti</span>
          {favoriteCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[9px] font-bold text-[#092d39]">{favoriteCount > 9 ? '9+' : favoriteCount}</span>}
        </button>
        <button type="button" data-md-nav-button="true" onClick={() => openTab('outline')} className={railButtonClass(activeTab === 'outline')} title="Struttura documento" aria-label="Struttura documento" aria-pressed={activeTab === 'outline'}>
          <MedicalDocsIcon name="outline" size={22} />
          <span data-md-sidebar-mobile-label="true">Indice</span>
        </button>
        <button type="button" data-md-nav-button="true" data-md-study-chat-launcher="true" onClick={() => openTab('chat')} className={railButtonClass(activeTab === 'chat')} title="Tutor IA: domande libere di studio" aria-label="Apri Tutor IA per domande libere di studio" aria-pressed={activeTab === 'chat'}>
          <MedicalDocsIcon name="spark" size={22} />
          <span data-md-sidebar-mobile-label="true">Tutor IA</span>
          <span className="sr-only">Chat separata dall’IA che analizza il documento</span>
        </button>
        <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-teal-200" title="MedicalDocs Pro">
          <span className="text-[10px] font-black tracking-tight">MD</span>
        </div>
      </aside>

      {activeTab && (
        <section data-md-sidebar-panel="true" className="flex min-h-0 w-[min(21rem,calc(100vw-4rem))] flex-col border-r border-slate-200 bg-[#fbfdfd] p-3.5 shadow-xl shadow-slate-900/5 sm:p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-tight text-slate-900">
                {activeTab === 'docs' ? 'La tua libreria' : activeTab === 'favorites' ? 'Documenti preferiti' : activeTab === 'chat' ? 'Tutor di studio' : 'Struttura documento'}
              </h2>
              {activeTab !== 'outline' && activeTab !== 'chat' && (
                <p className="mt-1 text-xs text-slate-500">
                  {activeTab === 'favorites' ? String(favoriteCount) + ' documenti nei preferiti' : String(allDocs?.length || 0) + ' documenti salvati su questo dispositivo'}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setActiveTab(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Chiudi pannello" title="Chiudi pannello">
              <X className="h-4 w-4" />
            </button>
          </div>

          {(activeTab === 'docs' || activeTab === 'favorites') && (
            <div className="flex min-h-0 flex-1 flex-col">
              <label className="relative mb-2.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Cerca titolo o contenuto..."
                  aria-label="Cerca documenti per titolo o contenuto"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <form onSubmit={(event) => { event.preventDefault(); createFolder() }} className="mb-3 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-teal-50/50 p-2.5">
                <label htmlFor="md-create-folder" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Le tue cartelle</label>
                <div className="flex min-w-0 items-center gap-1.5">
                  <input id="md-create-folder" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)}
                    maxLength={32} placeholder="Nuova cartella…"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  <button type="submit" disabled={!newFolderName.trim()} aria-label="Crea cartella" title="Crea cartella"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Esempio: Anatomia, Fisiologia o un esame personale.</p>
              </form>

              <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus-within:border-teal-400">
                <Folder className="h-4 w-4 shrink-0 text-teal-700" />
                <span className="shrink-0">Cartella</span>
                <select
                  aria-label="Filtra per cartella"
                  className="min-w-0 flex-1 appearance-none bg-transparent py-0.5 text-right text-xs font-semibold text-slate-800 outline-none"
                  value={folderFilter}
                  onChange={(event) => setFolderFilter(event.target.value)}
                >
                  <option value="Tutte le cartelle">Tutte</option>
                  {folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
                </select>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </label>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
                {allDocs === undefined && <p className="mt-6 text-center text-sm text-slate-500">Caricamento archivio...</p>}
                {filteredDocs?.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-7 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      {activeTab === 'favorites' ? <Star className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">{activeTab === 'favorites' ? 'Ancora nessun preferito' : 'Nessun documento trovato'}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{activeTab === 'favorites' ? 'Usa la stella su un documento per ritrovarlo velocemente qui.' : 'Prova a cambiare ricerca o cartella.'}</p>
                  </div>
                )}
                {filteredDocs?.map((doc) => (
                  <article key={doc.id} className={'group rounded-xl border p-2.5 transition focus-within:ring-2 focus-within:ring-teal-100 ' + (activeDocId === doc.id ? 'border-teal-300 bg-teal-50/80 shadow-sm' : 'border-slate-200 bg-white hover:border-teal-200 hover:shadow-md hover:shadow-slate-900/5')}>
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => onLoadDocument(doc)} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600" aria-current={activeDocId === doc.id ? 'page' : undefined}>
                        <span className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><FileText className="h-4 w-4" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">{doc.title || 'Documento senza titolo'}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">Modificato {new Date(doc.updatedAt).toLocaleDateString('it-IT')}</span>
                          </span>
                        </span>
                      </button>
                      <button type="button" onClick={() => { if (doc.id) onUpdateDocumentMetadata(doc.id, { favorite: !doc.favorite }) }} className={'rounded-lg p-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ' + (doc.favorite ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'text-slate-300 hover:bg-amber-50 hover:text-amber-500')} aria-label={doc.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'} title={doc.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}>
                        <Star className={'h-4 w-4 ' + (doc.favorite ? 'fill-current' : '')} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <label className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-teal-700" />
                        <select aria-label={'Sposta ' + (doc.title || 'documento') + ' in una cartella'} value={folders.includes(normaliseFolder(doc.folder)) ? normaliseFolder(doc.folder) : 'Generale'} onChange={(event) => { if (doc.id) onUpdateDocumentMetadata(doc.id, { folder: event.target.value }) }} className="min-w-0 max-w-[130px] truncate rounded-md bg-transparent py-1 text-[11px] font-medium text-slate-600 outline-none hover:bg-slate-50 focus:ring-2 focus:ring-teal-100">
                          {folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
                        </select>
                      </label>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" onClick={() => onDuplicateDocument(doc)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600" title={'Duplica ' + doc.title} aria-label={'Duplica ' + doc.title}>
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {activeDocId !== doc.id && (
                          <button type="button" onClick={(event) => handleDelete(event, doc.id!)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600" title={'Elimina ' + doc.title} aria-label={'Elimina ' + doc.title}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'chat' && <StudyChatPanel />}

          {activeTab === 'outline' && (
            <div className="flex-1 space-y-1 overflow-y-auto">
              {outline.length === 0 ? (
                <p className="text-sm text-slate-500">Aggiungi un titolo al documento per vedere qui la struttura.</p>
              ) : (
                outline.map((item) => (
                  <div key={item.id} className="truncate rounded-lg px-2 py-1.5 text-sm text-slate-700" style={{ paddingLeft: (item.level - 1) * 12 + 8 }}>
                    {item.text}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
