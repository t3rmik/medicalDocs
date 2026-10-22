'use client'

import { useEffect, useState, useRef } from 'react'
import { MedicalDocsAlertCircle as AlertCircle, MedicalDocsIcon } from '@/components/icons/MedicalDocsIcons'
import { PdfModeChoice } from '@/types'

interface FileOpenerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File, pdfMode?: PdfModeChoice) => void;
  initialFile?: File | null;
}

export function FileOpener({ isOpen, onClose, onFileSelect, initialFile = null }: FileOpenerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handledInitialFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!initialFile) { handledInitialFileRef.current = null; return; }
    if (!isOpen || handledInitialFileRef.current === initialFile) return;
    handledInitialFileRef.current = initialFile;
    setSelectedFile(null);
    setError(null);
    const ext = initialFile.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['docx', 'pdf', 'txt', 'html', 'htm'];
    if (!ext || !validExtensions.includes(ext)) { setError('Formato non supportato. Caricare un file .docx, PDF, TXT o HTML.'); return; }
    if (initialFile.size > 25 * 1024 * 1024) { setError('Dimensione massima superata. Il file non può eccedere i 25 MB.'); return; }
    if (ext === 'pdf') { setSelectedFile(initialFile); return; }
    onFileSelect(initialFile);
    onClose();
  }, [isOpen, initialFile, onFileSelect, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const validateAndSetFile = (file: File) => {
    setSelectedFile(null);
    setError(null);
    const validExtensions = ['docx', 'pdf', 'txt', 'html', 'htm'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !validExtensions.includes(ext)) {
      setError('Formato non supportato. Caricare un file .docx, .pdf, .txt o .html.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Dimensione massima superata. Il file non può eccedere i 25 MB.');
      return;
    }

    setSelectedFile(file);
    if (ext !== 'pdf') {
      onFileSelect(file);
      handleClose();
    }
  };

  return (
    <div data-md-file-opener="true" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div data-md-file-modal="true" className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Apri o importa un documento</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
        </div>

        {!selectedFile || !selectedFile.name.toLowerCase().endsWith('.pdf') ? (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={(e) => {
              if (e.target !== fileInputRef.current) fileInputRef.current?.click();
            }}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <MedicalDocsIcon name="upload" size={42} className="mb-3 text-teal-700" />
            <p className="text-sm font-semibold text-slate-700">Trascina qui il file o clicca per sfogliare</p>
            <p className="text-xs text-slate-400 mt-1">Supportati: Word (.docx), PDF, TXT, HTML (Max 25MB)</p>
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept=".docx,.pdf,.txt,.html,.htm" 
              onChange={(e) => { const file = e.currentTarget.files?.[0]; if (file) validateAndSetFile(file); e.currentTarget.value = ''; }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl flex items-center space-x-3 border border-blue-200">
              <MedicalDocsIcon name="document" size={34} className="text-teal-700" />
              <div>
                <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Scegli come gestire il PDF:</p>
              
              <button
                type="button"
                onClick={() => { onFileSelect(selectedFile, 'convert'); handleClose(); }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition flex items-start space-x-3"
              >
                <MedicalDocsIcon name="scan" size={24} className="mt-0.5 shrink-0 text-teal-700" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Converti in Testo Modificabile (con OCR)</p>
                  <p className="text-xs text-slate-500">Estrae il testo ed i paragrafi nell'editor Word per modificarli liberamente.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { onFileSelect(selectedFile, 'annotate'); handleClose(); }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition flex items-start space-x-3"
              >
                <MedicalDocsIcon name="pdf" size={24} className="mt-0.5 shrink-0 text-teal-700" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Modifica ed Annota PDF Originale</p>
                  <p className="text-xs text-slate-500">Mantiene la grafica originale e permette di firmare, oscurare e timbrare.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
