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
import { markdownToHtml } from '@/lib/markdown'
import { db, MedicalDocument } from '@/lib/db'
import { consumeSharedFile } from '@/lib/sharedFileInbox'
import { getFileSizeError, getMaxImportBytes, isTouchConstrainedDevice, MAX_PDF_OCR_BYTES } from '@/lib/fileLimits'
import type { DocumentPageSection } from '@/types/documentPages'

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
  
  const [documentVersion, setDocumentVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const activeDocRef = useRef<MedicalDocument>(activeDoc);
  const documentSessionRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{ doc: MedicalDocument; session: number } | null>(null);
  const saveInFlightRef = useRef(false);
  const flushPendingSaveRef = useRef<() => void>(() => {});

  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [isFileOpenerOpen, setIsFileOpenerOpen] = useState(false);
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [pdfAnnotatorFile, setPdfAnnotatorFile] = useState<File | null>(null);
  const [ocrState, setOcrState] = useState({ active: false, status: '', progress: 0 });
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);
  const insertIntoEditorRef = useRef<((html: string) => void) | null>(null);
  const importAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const shared = url.searchParams.get('shared');
    const failed = url.searchParams.get('shareFailed');
    const openFile = url.searchParams.get('openFile');
    const multipleFiles = url.searchParams.get('multipleFiles') === '1';
    if (!shared && !failed && openFile !== '1' && !multipleFiles) return;
    url.searchParams.delete('shared');
    url.searchParams.delete('shareFailed');
    url.searchParams.delete('openFile');
    url.searchParams.delete('multipleFiles');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    if (openFile === '1') setIsFileOpenerOpen(true);
    if (failed) {
      const message = failed === 'too-large' ? 'Il file supera il limite di 25 MB.'
        : failed === 'unsupported' ? 'Questo formato non è supportato da MedicalDocs.'
        : 'Il browser non ha consegnato il file a MedicalDocs. In WhatsApp prova Condividi → MedicalDocs; se non funziona, apri MedicalDocs e usa “Apri / Importa”.';
      toast.error(message, { duration: 10000 });
      return;
    }
    if (shared === '1') {
      let cancelled = false;
      void consumeSharedFile().then((file) => {
        if (cancelled) return;
        if (!file) { toast.error('MedicalDocs è stato aperto, ma il browser non ha trasferito il file. Usa “Apri / Importa” come alternativa.', { duration: 10000 }); return; }
        const maxBytes = getMaxImportBytes(file.name, isTouchConstrainedDevice());
        if (!maxBytes || file.size > maxBytes) { toast.error(getFileSizeError(file.name, maxBytes || MAX_PDF_OCR_BYTES), { duration: 10000 }); return; }
        if (multipleFiles) toast('MedicalDocs apre un documento alla volta: è stato aperto il primo file selezionato.', { duration: 8000 });
        setSharedFile(file);
        setIsFileOpenerOpen(true);
      }).catch(() => { if (!cancelled) toast.error('Non è stato possibile leggere il file condiviso. Usa “Apri / Importa”.'); });
      return () => { cancelled = true; };
    }
  }, []);
  const editorPageSectionsRef = useRef<(() => DocumentPageSection[]) | null>(null);
  const registerEditorPageSections = useCallback((handler: (() => DocumentPageSection[]) | null) => {
    editorPageSectionsRef.current = handler;
  }, []);
  const getEditorPageSections = useCallback(() => editorPageSectionsRef.current?.() ?? [], []);
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
    setDocumentVersion((version) => version + 1);
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
    setDocumentVersion((version) => version + 1);
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
    if (ext === 'pdf' && pdfMode === 'convert' && file.size > MAX_PDF_OCR_BYTES) {
      toast.error('Per conversione/OCR il limite è 25 MB. I PDF più grandi possono essere aperti per annotazione oppure divisi in parti.', { duration: 10000 });
      return;
    }

    setPdfAnnotatorFile(null);

    try {
      let html = '';
      if (ext === 'pdf' && pdfMode === 'convert') {
        importAbortControllerRef.current?.abort();
        const controller = new AbortController();
        importAbortControllerRef.current = controller;
        setOcrState({ active: true, status: 'Preparazione PDF per estrazione testo/OCR...', progress: 2 });
        const { extractTextFromPdf } = await import('@/lib/importPdf');
        const res = await extractTextFromPdf(file, (status, progress) => {
          setOcrState({ active: true, status, progress });
        }, controller.signal);
        if (controller.signal.aborted) return;
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
      if (err?.name === 'AbortError') toast('Importazione PDF annullata.');
      else toast.error(`Errore caricamento file: ${err?.message || 'errore imprevisto'}`);
    } finally {
      importAbortControllerRef.current = null;
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
      let pageLayout: unknown = null;
      try {
        const storedLayout = window.localStorage.getItem('medicaldocs.pageLayout.v2');
        if (storedLayout) pageLayout = JSON.parse(storedLayout);
      } catch {
        // Export remains available if local layout preferences are malformed.
      }
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: doc.content, format, title: doc.title, pageLayout }),
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
      // Keep the Blob URL alive while large downloads initialise.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
    <div data-md-app-shell="true" className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50">
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
        <div data-md-workspace="true" className="flex flex-1 overflow-hidden">
          <Sidebar 
            onLoadDocument={loadDocument} 
            onUpdateDocumentMetadata={handleUpdateDocumentMetadata}
            activeDocId={activeDoc.id} 
            currentHtml={activeDoc.content}
            onDuplicateDocument={handleDuplicateDocument}
          />
          <main className="flex-1 flex flex-col relative overflow-hidden print:overflow-visible print:bg-white">
            <MedicalEditor 
              documentVersion={documentVersion}
              onChange={handleContentChange}
              initialContent={activeDoc.content}
              isSaving={isSaving}
              onRegisterInsert={registerEditorInsert}
               onRegisterPageSections={registerEditorPageSections}
            />
          </main>
        </div>
      )}

      <FileOpener isOpen={isFileOpenerOpen} initialFile={sharedFile} onClose={() => { setIsFileOpenerOpen(false); setSharedFile(null); }} onFileSelect={handleFileSelect} />
      {isAIStudioOpen && (
        <AIStudio
          isOpen={true}
          onClose={() => setIsAIStudioOpen(false)}
          documentTitle={activeDoc.title}
          content={activeDoc.content}
           getPageSections={getEditorPageSections}
          onInsert={handleInsertAIResult}
        />
      )}
      {ocrState.active && <OcrProgress status={ocrState.status} progress={ocrState.progress} onCancel={() => importAbortControllerRef.current?.abort()} />}
    </div>
  );
}