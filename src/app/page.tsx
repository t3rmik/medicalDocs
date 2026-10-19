'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { Header } from '@/components/shared/Header'
import { Sidebar } from '@/components/shared/Sidebar'
import { MedicalEditor } from '@/components/editor/MedicalEditor'
import { FileOpener } from '@/components/shared/FileOpener'
import { OcrProgress } from '@/components/pdf/OcrProgress'
import { PdfModeChoice } from '@/types'
import { parseFileToHtml } from '@/lib/importDocx'
import { extractTextFromPdf } from '@/lib/importPdf'
import { db, MedicalDocument } from '@/lib/db'

const PdfAnnotator = dynamic(
  () => import('@/components/pdf/PdfAnnotator').then((mod) => mod.PdfAnnotator),
  { ssr: false }
)

export default function Home() {
  const [activeDoc, setActiveDoc] = useState<MedicalDocument>({
    title: 'Appunti_Studio_Laurea',
    content: '<h2>Appunti di Studio</h2><p>Argomento: [Titolo Capitolo]</p><p>Inserisci qui i tuoi appunti e schemi per la preparazione...</p>',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [editorKey, setEditorKey] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [isFileOpenerOpen, setIsFileOpenerOpen] = useState(false);
  const [pdfAnnotatorFile, setPdfAnnotatorFile] = useState<File | null>(null);
  const [ocrState, setOcrState] = useState({ active: false, status: '', progress: 0 });

  const handleContentChange = (html: string) => {
    setActiveDoc(prev => ({ ...prev, content: html }));
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const docToSave = { ...activeDoc, content: html, updatedAt: new Date() };
        if (docToSave.id) {
          await db.documents.put(docToSave);
        } else {
          const newId = await db.documents.add(docToSave);
          setActiveDoc(prev => ({ ...prev, id: newId }));
        }
      } catch (err) {
        toast.error('Errore durante il salvataggio automatico.');
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  };

  const handleTitleChange = (newTitle: string) => {
    setActiveDoc(prev => ({ ...prev, title: newTitle }));
    handleContentChange(activeDoc.content);
  };

  const loadDocument = (doc: MedicalDocument) => {
    setActiveDoc(doc);
    setPdfAnnotatorFile(null);
    setEditorKey(Date.now());
    toast.success('Documento caricato con successo.');
  };

  const handleNewDocument = () => {
    const newDoc = {
      title: 'Nuovo_Documento_Studio',
      content: '<h2>Nuovo Capitolo</h2><p>Inizia a scrivere i tuoi appunti...</p>',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setActiveDoc(newDoc);
    setPdfAnnotatorFile(null);
    setEditorKey(Date.now());
  };

  const handleFileSelect = async (file: File, pdfMode?: PdfModeChoice) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf' && pdfMode === 'annotate') {
      setPdfAnnotatorFile(file);
      return;
    }
    
    setPdfAnnotatorFile(null);
    
    try {
      let html = '';
      if (ext === 'pdf' && pdfMode === 'convert') {
        setOcrState({ active: true, status: 'Estrazione testo e OCR in corso...', progress: 0 });
        const res = await extractTextFromPdf(file, (status, progress) => {
          setOcrState({ active: true, status, progress });
        });
        html = res.html;
      } else {
        html = await parseFileToHtml(file);
      }
      
      const importedDoc = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: html,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newId = await db.documents.add(importedDoc);
      loadDocument({ ...importedDoc, id: newId });
      toast.success('File caricato e visualizzato correttamente!');
      
    } catch (err: any) {
      toast.error(`Errore caricamento file: ${err.message}`);
    } finally {
      setOcrState({ active: false, status: '', progress: 0 });
    }
  };

  const handleExport = async (format: string) => {
    setLoadingFormat(format);
    const toastId = toast.loading('Generazione file in corso...');
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: activeDoc.content, format, title: activeDoc.title }),
      });
      const result = await res.json();
      if (result.success && result.dataUrl) {
        const link = document.createElement('a');
        link.href = result.dataUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Esportato come ${format.toUpperCase()} con successo!`, { id: toastId });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Errore durante l\'esportazione.', { id: toastId });
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <Header 
        onExport={handleExport} 
        loadingFormat={loadingFormat} 
        onOpenClick={() => setIsFileOpenerOpen(true)}
        onNewDocument={handleNewDocument}
        activeFileName={activeDoc.title}
        onTitleChange={handleTitleChange}
        isSaving={isSaving}
      />
      
      {pdfAnnotatorFile ? (
        <div className="flex-1 overflow-hidden relative">
          <PdfAnnotator file={pdfAnnotatorFile} onClose={() => setPdfAnnotatorFile(null)} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            onLoadDocument={loadDocument} 
            activeDocId={activeDoc.id} 
            currentHtml={activeDoc.content}
          />
          <main className="flex-1 flex flex-col relative overflow-hidden print:overflow-visible print:bg-white">
            <MedicalEditor 
              key={editorKey} 
              onChange={handleContentChange} 
              initialContent={activeDoc.content} 
            />
          </main>
        </div>
      )}

      <FileOpener isOpen={isFileOpenerOpen} onClose={() => setIsFileOpenerOpen(false)} onFileSelect={handleFileSelect} />
      {ocrState.active && <OcrProgress status={ocrState.status} progress={ocrState.progress} />}
    </div>
  );
}