'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { Header } from '@/components/shared/Header'
import { AIStudio } from '@/components/ai/AIStudio'
import { Sidebar } from '@/components/shared/Sidebar'
import { MedicalEditor } from '@/components/editor/MedicalEditor'
import { FileOpener } from '@/components/shared/FileOpener'
import { OcrProgress } from '@/components/pdf/OcrProgress'
import { PdfModeChoice } from '@/types'
import { parseFileToHtml } from '@/lib/importDocx'
import { extractTextFromPdf } from '@/lib/importPdf'
import { markdownToHtml } from '@/lib/markdown'
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
  const activeDocRef = useRef<MedicalDocument>(activeDoc);
  const documentSessionRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{ doc: MedicalDocument; session: number } | null>(null);
  const saveInFlightRef = useRef(false);
  const flushPendingSaveRef = useRef<() => void>(() => {});

  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [isFileOpenerOpen, setIsFileOpenerOpen] = useState(false);
  const [pdfAnnotatorFile, setPdfAnnotatorFile] = useState<File | null>(null);
  const [ocrState, setOcrState] = useState({ active: false, status: '', progress: 0 });
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);
  const insertIntoEditorRef = useRef<((html: string) => void) | null>(null);
  const registerEditorInsert = useCallback((handler: ((html: string) => void) | null) => {
    insertIntoEditorRef.current = handler;
  }, []);


  const persistDocument = async (doc: MedicalDocument, session: number) => {
    const docToSave = { ...doc, updatedAt: new Date() };
    let savedDoc: MedicalDocument;

    if (docToSave.id) {
      await db.documents.put(docToSave);
      savedDoc = docToSave;
    } else {
      const id = await db.documents.add(docToSave);
      savedDoc = { ...docToSave, id };
    }

    // Non applicare un ID o uno stato salvato a un documento aperto nel frattempo.
    if (documentSessionRef.current === session) {
      const currentDoc = activeDocRef.current;
      if (!currentDoc.id && savedDoc.id) {
        const docWithId = { ...currentDoc, id: savedDoc.id };
        activeDocRef.current = docWithId;
        setActiveDoc(docWithId);
      }
    }
  };

  const runPendingSave = async (pending: { doc: MedicalDocument; session: number }) => {
    if (saveInFlightRef.current) {
      pendingSaveRef.current = pending;
      return;
    }

    saveInFlightRef.current = true;
    try {
      const docToSave =
        documentSessionRef.current === pending.session
          ? activeDocRef.current
          : pending.doc;
      await persistDocument(docToSave, pending.session);
    } catch (err) {
      toast.error('Errore durante il salvataggio automatico.');
    } finally {
      saveInFlightRef.current = false;
      const nextPending = pendingSaveRef.current;
      if (nextPending) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        pendingSaveRef.current = null;
        void runPendingSave(nextPending);
      } else if (!saveTimeoutRef.current) {
        setIsSaving(false);
      }
    }
  };

  const scheduleSave = (doc: MedicalDocument) => {
    pendingSaveRef.current = { doc, session: documentSessionRef.current };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        void runPendingSave(pending);
      }
    }, 1500);
  };

  const flushPendingSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (pending) {
      pendingSaveRef.current = null;
      void runPendingSave(pending);
    }
  };

  // Keep the latest flush callback available to stable browser lifecycle listeners.
  useEffect(() => {
    flushPendingSaveRef.current = flushPendingSave;
  });

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSaveRef.current();
      }
    };
    const flushOnPageHide = () => flushPendingSaveRef.current();

    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushOnPageHide);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      window.removeEventListener('pagehide', flushOnPageHide);
    };
  }, []);

  const handleContentChange = (html: string) => {
    const nextDoc = { ...activeDocRef.current, content: html, updatedAt: new Date() };
    activeDocRef.current = nextDoc;
    setActiveDoc(nextDoc);
    scheduleSave(nextDoc);
  };

  const handleTitleChange = (newTitle: string) => {
    const nextDoc = { ...activeDocRef.current, title: newTitle, updatedAt: new Date() };
    activeDocRef.current = nextDoc;
    setActiveDoc(nextDoc);
    scheduleSave(nextDoc);
  };

  const loadDocument = (doc: MedicalDocument) => {
    flushPendingSave();
    documentSessionRef.current += 1;
    activeDocRef.current = doc;
    setActiveDoc(doc);
    setPdfAnnotatorFile(null);
    setEditorKey(Date.now());
    toast.success('Documento caricato con successo.');
  };

  const handleNewDocument = () => {
    flushPendingSave();
    documentSessionRef.current += 1;
    const newDoc: MedicalDocument = {
      title: 'Nuovo_Documento_Studio',
      content: '<h2>Nuovo Capitolo</h2><p>Inizia a scrivere i tuoi appunti...</p>',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    activeDocRef.current = newDoc;
    setActiveDoc(newDoc);
    setPdfAnnotatorFile(null);
    setEditorKey(Date.now());
  };

  const handleDuplicateDocument = async (doc: MedicalDocument) => {
    try {
      flushPendingSave();
      const source = doc.id && activeDocRef.current.id === doc.id ? activeDocRef.current : doc;
      const now = new Date();
      const duplicate: MedicalDocument = {
        title: (source.title.trim() || 'Documento') + ' - copia',
        content: source.content,
        favorite: false,
        folder: source.folder || 'Generale',
        createdAt: now,
        updatedAt: now,
      };
      const id = await db.documents.add(duplicate);
      loadDocument({ ...duplicate, id });
      toast.success('Copia del documento creata.');
    } catch {
      toast.error('Impossibile duplicare il documento.');
    }
  };

  const handleOpenAIStudio = () => {
    if (pdfAnnotatorFile) {
      toast.error("Torna all'editor testuale per usare AI Studio.");
      return;
    }
    setIsAIStudioOpen(true);
  };

  const handleInsertAIResult = (result: string, actionLabel: string) => {
    const insertHtml = insertIntoEditorRef.current;
    if (!insertHtml) { toast.error("L'editor non è pronto. Chiudi AI Studio, attendi il caricamento e riprova."); return; }
    const safe = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    insertHtml('<h2>AI Studio — ' + safe(actionLabel) + '</h2>' + markdownToHtml(result, 1));
    setIsAIStudioOpen(false);
    toast.success('Risultato AI inserito con formattazione.');
  };

  const handleUpdateDocumentMetadata = async (
    docId: number,
    updates: Partial<Pick<MedicalDocument, 'favorite' | 'folder'>>
  ) => {
    try {
      if (activeDocRef.current.id === docId) {
        const nextDoc = { ...activeDocRef.current, ...updates, updatedAt: new Date() };
        activeDocRef.current = nextDoc;
        setActiveDoc(nextDoc);
        scheduleSave(nextDoc);
      } else {
        await db.documents.update(docId, { ...updates, updatedAt: new Date() });
      }
    } catch {
      toast.error('Impossibile aggiornare preferiti o cartella.');
    }
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
      const doc = activeDocRef.current;
      if (format !== 'pdf' && doc.content.length > 2_900_000) {
        throw new Error('Il documento è troppo grande per l’esportazione server. Riduci o dividi le immagini e riprova.');
      }
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: doc.content, format, title: doc.title }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : "Il server non è riuscito a esportare il documento."
        );
      }

      const blob = await res.blob();
      if (!blob.size) throw new Error('Il file esportato è vuoto.');

      const extension = format === 'word' ? 'docx' : format;
      const safeTitle = (doc.title || 'Documento')
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 120) || 'Documento';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Esportato come ${extension.toUpperCase()} con successo!`, { id: toastId });
    } catch (err) {
      if (format === 'pdf' && !pdfAnnotatorFile) {
        toast.error(
          "Il server non è riuscito a generare il PDF. Si aprirà la stampa del documento: scegli “Salva come PDF”.",
          { id: toastId, duration: 9000 }
        );
        window.setTimeout(() => window.print(), 350);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Errore durante l'esportazione.",
          { id: toastId }
        );
      }
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50">
      <Header 
        onExport={handleExport} 
        loadingFormat={loadingFormat} 
        onOpenClick={() => setIsFileOpenerOpen(true)}
        onNewDocument={handleNewDocument}
        activeFileName={activeDoc.title}
        onTitleChange={handleTitleChange}
        onOpenAIStudio={handleOpenAIStudio}
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
            onUpdateDocumentMetadata={handleUpdateDocumentMetadata}
            activeDocId={activeDoc.id} 
            currentHtml={activeDoc.content}
            onDuplicateDocument={handleDuplicateDocument}
          />
          <main className="flex-1 flex flex-col relative overflow-hidden print:overflow-visible print:bg-white">
            <MedicalEditor 
              key={editorKey}
              onChange={handleContentChange}
              initialContent={activeDoc.content}
              isSaving={isSaving}
              onRegisterInsert={registerEditorInsert}
            />
          </main>
        </div>
      )}

      <FileOpener isOpen={isFileOpenerOpen} onClose={() => setIsFileOpenerOpen(false)} onFileSelect={handleFileSelect} />
      <AIStudio isOpen={isAIStudioOpen} onClose={() => setIsAIStudioOpen(false)} documentTitle={activeDoc.title} content={activeDoc.content} onInsert={handleInsertAIResult} />
      {ocrState.active && <OcrProgress status={ocrState.status} progress={ocrState.progress} />}
    </div>
  );
}