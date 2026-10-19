'use client'

import { useState } from 'react'
import { FileText, FolderOpen, FilePlus, Download, Printer, Save, Loader2 } from 'lucide-react'

interface HeaderProps {
  onExport: (format: string) => void;
  loadingFormat: string | null;
  onOpenClick: () => void;
  onNewDocument: () => void;
  activeFileName: string;
  isSaving: boolean;
  onTitleChange: (newTitle: string) => void;
}

export function Header({ onExport, loadingFormat, onOpenClick, onNewDocument, activeFileName, isSaving, onTitleChange }: HeaderProps) {
  const [activeMenu, setActiveMenu] = useState<'file' | 'export' | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white shadow-md z-50 relative print:hidden">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg shadow">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
            MedicalDocs Pro
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded font-mono">v3.1</span>
          </h1>

          <div className="text-xs text-slate-400 flex items-center space-x-3 mt-0.5 relative">
            <div className="relative">
              <button 
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                className="hover:text-white transition py-0.5 px-1 rounded hover:bg-slate-800"
              >
                File
              </button>
              {activeMenu === 'file' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-slate-200">
                  <button onClick={() => { onNewDocument(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs">
                    <FilePlus className="w-3.5 h-3.5 text-green-400" /><span>Nuovo Appunto / Tesi</span>
                  </button>
                  <button onClick={() => { onOpenClick(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" /><span>Apri / Importa File...</span>
                  </button>
                  <div className="border-t border-slate-700 my-1" />
                  <button onClick={() => { handlePrint(); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 flex items-center space-x-2 text-xs">
                    <Printer className="w-3.5 h-3.5 text-slate-300" /><span>Stampa Documento</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                className="hover:text-white transition py-0.5 px-1 rounded hover:bg-slate-800"
              >
                Esporta
              </button>
              {activeMenu === 'export' && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-slate-200">
                  <button onClick={() => { onExport('word'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-xs">Esporta in Word (.docx)</button>
                  <button onClick={() => { onExport('pdf'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-xs text-red-400">Esporta in PDF</button>
                  <div className="border-t border-slate-700 my-1" />
                  <button onClick={() => { onExport('html'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-xs">Pagina Web (.html)</button>
                  <button onClick={() => { onExport('md'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-xs">Markdown (.md)</button>
                  <button onClick={() => { onExport('txt'); setActiveMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-700 text-xs">Solo testo (.txt)</button>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1 pl-3 border-l border-slate-700">
              {isSaving ? (
                <><Loader2 className="w-3 h-3 animate-spin text-slate-400" /><span className="text-slate-400">Salvataggio...</span></>
              ) : (
                <><Save className="w-3 h-3 text-green-400" /><span className="text-green-400">Salvato</span></>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <input 
          type="text" 
          value={activeFileName}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm px-3 py-1 rounded outline-none focus:border-blue-500 w-48 transition"
          placeholder="Nome documento..."
        />
        <button onClick={() => onExport('word')} disabled={loadingFormat === 'word'} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center space-x-1 disabled:opacity-50">
          {loadingFormat === 'word' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} <span>.docx</span>
        </button>
        <button onClick={() => onExport('pdf')} disabled={loadingFormat === 'pdf'} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center space-x-1 disabled:opacity-50">
          {loadingFormat === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} <span>PDF</span>
        </button>
      </div>
    </header>
  );
}