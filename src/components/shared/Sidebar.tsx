'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileBox, X, FileText, Trash2, ListTree, Copy, Search } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MedicalDocument } from '@/lib/db'

interface SidebarProps {
  onLoadDocument: (doc: MedicalDocument) => void;
  onDuplicateDocument: (doc: MedicalDocument) => void;
  activeDocId?: number;
  currentHtml?: string;
}

export function Sidebar({ onLoadDocument, onDuplicateDocument, activeDocId, currentHtml }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'docs' | 'outline' | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const allDocs = useLiveQuery(() => db.documents.orderBy('updatedAt').reverse().toArray())
  const query = searchTerm.trim().toLocaleLowerCase('it')
  const searchableText = (value: string) =>
    value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').toLocaleLowerCase('it')
  const filteredDocs = allDocs?.filter((doc) =>
    !query ||
    doc.title.toLocaleLowerCase('it').includes(query) ||
    searchableText(doc.content).includes(query)
  )

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation()
    if (window.confirm('Eliminare definitivamente questo documento?')) {
      try {
        await db.documents.delete(id)
      } catch {
        window.alert('Impossibile eliminare il documento.')
      }
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
    } catch {
      return []
    }
  }

  const outline = getOutline()

  return (
    <div className="flex min-h-0 shrink-0 print:hidden">
      <aside className="z-40 flex w-14 shrink-0 flex-col items-center gap-3 border-r border-[#0d4654] bg-gradient-to-b from-[#092d39] via-[#0b3545] to-[#071f2e] py-4 shadow-xl sm:w-16">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <Image src="/medicaldocs-mark.svg" alt="MedicalDocs" width={34} height={34} priority className="h-9 w-9 object-contain" />
        </div>
        <div className="mb-1 h-px w-7 bg-white/15" />
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'docs' ? null : 'docs')}
          className={'rounded-xl p-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ' + (activeTab === 'docs' ? 'bg-white/15 text-teal-200 shadow-inner' : 'text-slate-400 hover:bg-white/10 hover:text-white')}
          title="Libreria documenti"
          aria-label="Libreria documenti"
          aria-pressed={activeTab === 'docs'}
        >
          <FileBox className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'outline' ? null : 'outline')}
          className={'rounded-xl p-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 ' + (activeTab === 'outline' ? 'bg-white/15 text-teal-200 shadow-inner' : 'text-slate-400 hover:bg-white/10 hover:text-white')}
          title="Struttura documento"
          aria-label="Struttura documento"
          aria-pressed={activeTab === 'outline'}
        >
          <ListTree className="h-5 w-5" />
        </button>
      </aside>

      {activeTab && (
        <section className="flex min-h-0 w-[min(20rem,calc(100vw-4rem))] flex-col border-r border-slate-200 bg-[#fbfdfd] p-4 shadow-xl shadow-slate-900/5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                {activeTab === 'docs' ? 'La tua libreria' : 'Struttura documento'}
              </h2>
              {activeTab === 'docs' && (
                <p className="mt-1 text-xs text-slate-500">
                  {allDocs?.length || 0} documenti salvati localmente
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Chiudi pannello"
              title="Chiudi pannello"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeTab === 'docs' && (
            <div className="flex-1 overflow-y-auto">
              <label className="relative mb-3 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Cerca titolo o contenuto..."
                  aria-label="Cerca documenti per titolo o contenuto"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="space-y-2">
                {filteredDocs?.length === 0 && (
                  <p className="mt-6 text-center text-sm text-slate-500">Nessun documento corrispondente.</p>
                )}
                {filteredDocs?.map((doc) => (
                  <div
                    key={doc.id}
                    className={'group flex items-start justify-between gap-2 rounded-xl border p-2 transition focus-within:ring-2 focus-within:ring-teal-100 ' + (activeDocId === doc.id ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm')}
                  >
                    <button
                      type="button"
                      onClick={() => onLoadDocument(doc)}
                      className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
                      aria-current={activeDocId === doc.id ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                        <span className="truncate">{doc.title || 'Documento senza titolo'}</span>
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-500">
                        Modificato: {new Date(doc.updatedAt).toLocaleDateString('it-IT')}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onDuplicateDocument(doc) }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        title={'Duplica ' + doc.title}
                        aria-label={'Duplica ' + doc.title}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {activeDocId !== doc.id && (
                        <button
                          type="button"
                          onClick={(event) => handleDelete(event, doc.id!)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                          title={'Elimina ' + doc.title}
                          aria-label={'Elimina ' + doc.title}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
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
                  <div
                    key={item.id}
                    className="truncate rounded-lg px-2 py-1.5 text-sm text-slate-700"
                    style={{ paddingLeft: (item.level - 1) * 12 + 8 }}
                  >
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
