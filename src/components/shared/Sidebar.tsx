'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileBox, X, FileText, Trash2, ListTree, Copy, Search, Star, Folder, ChevronDown } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MedicalDocument } from '@/lib/db'

interface SidebarProps {
  onLoadDocument: (doc: MedicalDocument) => void;
  onDuplicateDocument: (doc: MedicalDocument) => void;
  onUpdateDocumentMetadata: (docId: number, updates: Partial<Pick<MedicalDocument, 'favorite' | 'folder'>>) => void;
  activeDocId?: number;
  currentHtml?: string;
}

const FOLDERS = ['Generale', 'Studio', 'Clinica', 'Università', 'Personale'] as const
type FolderName = (typeof FOLDERS)[number]
type SidebarTab = 'docs' | 'favorites' | 'outline' | null

export function Sidebar({ onLoadDocument, onDuplicateDocument, onUpdateDocumentMetadata, activeDocId, currentHtml }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [folderFilter, setFolderFilter] = useState<'Tutte le cartelle' | FolderName>('Tutte le cartelle')
  const allDocs = useLiveQuery(() => db.documents.orderBy('updatedAt').reverse().toArray())
  const query = searchTerm.trim().toLocaleLowerCase('it')
  const searchableText = (value: string) =>
    value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').toLocaleLowerCase('it')
  const filteredDocs = allDocs?.filter((doc) => {
    const matchesQuery = !query || doc.title.toLocaleLowerCase('it').includes(query) || searchableText(doc.content).includes(query)
    const matchesTab = activeTab !== 'favorites' || Boolean(doc.favorite)
    const matchesFolder = folderFilter === 'Tutte le cartelle' || (doc.folder || 'Generale') === folderFilter
    return matchesQuery && matchesTab && matchesFolder
  })
  const favoriteCount = allDocs?.filter((doc) => doc.favorite).length || 0

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation()
    if (window.confirm('Eliminare definitivamente questo documento?')) {
      try { await db.documents.delete(id) }
      catch { window.alert('Impossibile eliminare il documento.') }
    }
  }

  const getOutline = () => {
    if (typeof window === 'undefined' || !currentHtml) return []
    try {
      const parser = new DOMParser()
      const parsed = parser.parseFromString(currentHtml, 'text/html')
      return Array.from(parsed.querySelectorAll('h1, h2, h3')).map((heading, index) => ({
        id: index,
        text: heading.textContent || 'Intestazione senza titolo',
        level: Number(heading.tagName.replace('H', '')),
      }))
    } catch { return [] }
  }

  const outline = getOutline()
  const openTab = (tab: Exclude<SidebarTab, null>) => setActiveTab(activeTab === tab ? null : tab)
  const railButtonClass = (selected: boolean) =>
    'relative flex items-center justify-center rounded-xl p-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ' +
    (selected ? 'bg-white/15 text-teal-200 shadow-inner ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/10 hover:text-white')

  return (
    <div className="flex min-h-0 shrink-0 print:hidden">
      <aside className="z-40 flex w-14 shrink-0 flex-col items-center gap-3 border-r border-[#0d4654] bg-gradient-to-b from-[#092d39] via-[#0b3545] to-[#071f2e] py-4 shadow-xl sm:w-16">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <Image src="/medicaldocs-mark.svg" alt="MedicalDocs" width={34} height={34} priority className="h-9 w-9 object-contain" />
        </div>
        <div className="mb-1 h-px w-7 bg-white/15" />
        <button type="button" onClick={() => openTab('docs')} className={railButtonClass(activeTab === 'docs')} title="Tutti i documenti" aria-label="Tutti i documenti" aria-pressed={activeTab === 'docs'}>
          <FileBox className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => openTab('favorites')} className={railButtonClass(activeTab === 'favorites')} title="Preferiti" aria-label="Preferiti" aria-pressed={activeTab === 'favorites'}>
          <Star className="h-5 w-5" />
          {favoriteCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-400 px-1 text-[9px] font-bold text-[#092d39]">{favoriteCount > 9 ? '9+' : favoriteCount}</span>}
        </button>
        <button type="button" onClick={() => openTab('outline')} className={railButtonClass(activeTab === 'outline')} title="Struttura documento" aria-label="Struttura documento" aria-pressed={activeTab === 'outline'}>
          <ListTree className="h-5 w-5" />
        </button>
        <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-teal-200" title="MedicalDocs Pro">
          <span className="text-[10px] font-black tracking-tight">MD</span>
        </div>
      </aside>

      {activeTab && (
        <section className="flex min-h-0 w-[min(21rem,calc(100vw-4rem))] flex-col border-r border-slate-200 bg-[#fbfdfd] p-3.5 shadow-xl shadow-slate-900/5 sm:p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-tight text-slate-900">
                {activeTab === 'docs' ? 'La tua libreria' : activeTab === 'favorites' ? 'Documenti preferiti' : 'Struttura documento'}
              </h2>
              {activeTab !== 'outline' && (
                <p className="mt-1 text-xs text-slate-500">
                  {activeTab === 'favorites' ? String(favoriteCount) + ' documenti nei preferiti' : String(allDocs?.length || 0) + ' documenti salvati su questo dispositivo'}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setActiveTab(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Chiudi pannello" title="Chiudi pannello">
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeTab !== 'outline' && (
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
              <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus-within:border-teal-400">
                <Folder className="h-4 w-4 shrink-0 text-teal-700" />
                <span className="shrink-0">Cartella</span>
                <select
                  aria-label="Filtra per cartella"
                  className="min-w-0 flex-1 appearance-none bg-transparent py-0.5 text-right text-xs font-semibold text-slate-800 outline-none"
                  value={folderFilter}
                  onChange={(event) => setFolderFilter(event.target.value as 'Tutte le cartelle' | FolderName)}
                >
                  <option value="Tutte le cartelle">Tutte</option>
                  {FOLDERS.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
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
                        <select aria-label={'Sposta ' + (doc.title || 'documento') + ' in una cartella'} value={FOLDERS.includes((doc.folder || 'Generale') as FolderName) ? (doc.folder || 'Generale') : 'Generale'} onChange={(event) => { if (doc.id) onUpdateDocumentMetadata(doc.id, { folder: event.target.value }) }} className="min-w-0 max-w-[130px] truncate rounded-md bg-transparent py-1 text-[11px] font-medium text-slate-600 outline-none hover:bg-slate-50 focus:ring-2 focus:ring-teal-100">
                          {FOLDERS.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
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
