'use client'

import { useState } from 'react'
import { FileBox, X, FileText, Trash2, ListTree } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MedicalDocument } from '@/lib/db'

interface SidebarProps {
  onLoadDocument: (doc: MedicalDocument) => void;
  activeDocId?: number;
  currentHtml?: string;
}

export function Sidebar({ onLoadDocument, activeDocId, currentHtml }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'docs' | 'outline' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const allDocs = useLiveQuery(() => db.documents.orderBy('updatedAt').reverse().toArray());
  const filteredDocs = allDocs?.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(confirm('Eliminare definitivamente questo documento?')) {
      await db.documents.delete(id);
    }
  };

  const getOutline = () => {
    if (typeof window === 'undefined' || !currentHtml) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, 'text/html');
      const headings = doc.querySelectorAll('h1, h2, h3');
      return Array.from(headings).map((h, i) => ({
        id: i,
        text: h.textContent || '',
        level: Number(h.tagName.replace('H', ''))
      }));
    } catch (e) {
      return [];
    }
  };

  const outline = getOutline();

  return (
    <div className="flex z-40 print:hidden">
      <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-6 shadow-sm">
        <button 
          onClick={() => setActiveTab(activeTab === 'docs' ? null : 'docs')}
          className={`p-2.5 rounded-xl transition ${activeTab === 'docs' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
          title="Libreria Documenti"
        >
          <FileBox className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setActiveTab(activeTab === 'outline' ? null : 'outline')}
          className={`p-2.5 rounded-xl transition ${activeTab === 'outline' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
          title="Struttura Documento"
        >
          <ListTree className="w-5 h-5" />
        </button>
      </aside>

      {activeTab && (
        <div className="w-72 bg-white border-r border-slate-200 p-4 shadow-xl flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {activeTab === 'docs' ? 'I Miei Appunti e Tesi' : 'Struttura Studio'}
            </h3>
            <button onClick={() => setActiveTab(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>

          {activeTab === 'docs' && (
            <div className="flex-1 overflow-y-auto">
              <input 
                type="text" 
                placeholder="Cerca nei documenti..." 
                className="w-full text-xs p-2 mb-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="space-y-2">
                {filteredDocs?.length === 0 && <p className="text-xs text-slate-400 text-center mt-4">Nessun documento trovato.</p>}
                {filteredDocs?.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => onLoadDocument(doc)}
                    className={`p-3 border rounded-xl cursor-pointer transition flex items-start justify-between group
                      ${activeDocId === doc.id ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {doc.title}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Modificato: {new Date(doc.updatedAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    {activeDocId !== doc.id && (
                      <button onClick={(e) => handleDelete(e, doc.id!)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'outline' && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {outline.length === 0 ? (
                <p className="text-xs text-slate-400">Nessuna intestazione trovata.</p>
              ) : (
                outline.map(item => (
                  <div key={item.id} className="text-xs text-slate-700 truncate" style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
                    • {item.text}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}