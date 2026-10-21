'use client'

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createWorker } from 'tesseract.js';
import { Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Edit3, ShieldAlert, Stamp, CheckCircle, Move, Undo2, Redo2, PenLine, Highlighter, ScanText, WandSparkles, Type, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfAnnotatorProps {
  file: File;
  onClose: () => void;
}

type ToolMode = 'none' | 'text' | 'editText' | 'redact' | 'stamp' | 'sign' | 'draw' | 'highlight';
type AnnotationType = ToolMode | 'textEdit';

interface PdfTextTarget {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  source: 'pdf' | 'ocr';
}

interface Annotation {
  id: string;
  page: number;
  type: AnnotationType;
  x: number;
  y: number;
  text?: string;
  color?: string;
  points?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
  width?: number;
  height?: number;
  sourceTextId?: string;
  originalText?: string;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  fontSize?: number;
}

export function PdfAnnotator({ file, onClose }: PdfAnnotatorProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolMode>('none');
  const [redactColor, setRedactColor] = useState('#0f172a');
  const [inkColor, setInkColor] = useState('#2563eb');
  const [pageTextItems, setPageTextItems] = useState<PdfTextTarget[]>([]);
  const [ocrTargetsByPage, setOcrTargetsByPage] = useState<Record<number, PdfTextTarget[]>>({});
  const [textSource, setTextSource] = useState<'pdf' | 'ocr'>('pdf');
  const [selectedTextItem, setSelectedTextItem] = useState<PdfTextTarget | null>(null);
  const [replacementText, setReplacementText] = useState('');
  const [annotationDraftText, setAnnotationDraftText] = useState('Nota di studio');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isRewritingText, setIsRewritingText] = useState(false);
  const [isPageAiOpen, setIsPageAiOpen] = useState(false);
  const [pageAiPrompt, setPageAiPrompt] = useState('Spiega i concetti principali di questa pagina in modo chiaro.');
  const [pageAiAnswer, setPageAiAnswer] = useState('');
  const [pageAiModel, setPageAiModel] = useState('');
  const [isPageAiLoading, setIsPageAiLoading] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const drawingPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const isDrawingRef = useRef(false);
  
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggedAnnotationsRef = useRef<Annotation[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const pushHistory = (newAnnotations: Annotation[]) => {
    const updatedHistory = history.slice(0, historyStep + 1);
    setHistory([...updatedHistory, newAnnotations]);
    setHistoryStep(updatedHistory.length);
    setAnnotations(newAnnotations);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setAnnotations(history[historyStep - 1]);
      toast('Azione annullata', { icon: '↩️' });
    } else if (historyStep === 0) {
      setHistoryStep(-1);
      setAnnotations([]);
      toast('Tutto ripulito', { icon: '↩️' });
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setAnnotations(history[historyStep + 1]);
      toast('Azione ripristinata', { icon: '↪️' });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isMounted) {
          setPdfDoc(loadedPdf);
          setNumPages(loadedPdf.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Errore caricamento PDF Viewer:", err);
          toast.error("Impossibile caricare il visualizzatore PDF.");
          setLoading(false);
        }
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        if (!isMounted) return;

        // Read the actual PDF text objects; no character-count page simulation.
        const textContent = await page.getTextContent();
        const transform = viewport.transform;
        const targets: PdfTextTarget[] = [];
        textContent.items.forEach((rawItem: any, index: number) => {
          if (typeof rawItem.str !== 'string' || !rawItem.str.trim() || !Array.isArray(rawItem.transform)) return;
          const item = rawItem as { str: string; transform: number[]; width?: number; height?: number };
          const m = item.transform;
          const c = transform[0] * m[2] + transform[2] * m[3];
          const d = transform[1] * m[2] + transform[3] * m[3];
          const e = transform[0] * m[4] + transform[2] * m[5] + transform[4];
          const f = transform[1] * m[4] + transform[3] * m[5] + transform[5];
          const fontPx = Math.max(5, Math.hypot(c, d) || Math.abs(item.height || 10) * scale);
          const widthPx = Math.max(3, Math.abs(item.width || 0) * scale);
          targets.push({
            id: 'pdf-' + pageNum + '-' + index,
            page: pageNum,
            text: item.str,
            x: e / scale,
            y: (f - fontPx) / scale,
            width: widthPx / scale,
            height: fontPx / scale,
            fontSize: fontPx / scale,
            source: 'pdf',
          });
        });
        if (!isMounted) return;
        const ocrTargets = ocrTargetsByPage[pageNum];
        setPageTextItems(ocrTargets?.length ? ocrTargets : targets);
        setTextSource(ocrTargets?.length ? 'ocr' : 'pdf');
        setSelectedTextItem(null);
        setReplacementText('');
      } catch (err) {
        console.error("Errore render pagina PDF:", err);
      }
    };
    void renderPage();
    return () => { isMounted = false; };
  }, [pdfDoc, pageNum, scale, ocrTargetsByPage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'none' || activeTool === 'draw' || activeTool === 'editText') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left) / scale, y = (e.clientY - rect.top) / scale;
    let textVal = '';
    if (activeTool === 'text') { textVal = annotationDraftText.trim(); if (!textVal) { toast.error('Scrivi prima il testo da inserire nella pagina.'); return; } }
    const newAnn: Annotation = { id: Math.random().toString(36).substring(2, 9), page: pageNum, type: activeTool, x, y, text: textVal, color: activeTool === 'highlight' ? '#fde047' : redactColor, width: activeTool === 'highlight' ? 140 : activeTool === 'redact' ? 100 : undefined, height: activeTool === 'highlight' ? 18 : activeTool === 'redact' ? 15 : undefined };
    pushHistory([...annotations, newAnn]); toast.success(activeTool === 'highlight' ? 'Evidenziazione aggiunta.' : activeTool === 'text' ? 'Testo aggiunto.' : 'Elemento aggiunto con successo!'); setActiveTool('none');
  };

  const beginTextEdit = (item: PdfTextTarget) => {
    setSelectedTextItem(item);
    const existing = annotations.find((ann) => ann.type === 'textEdit' && ann.sourceTextId === item.id);
    setReplacementText(existing?.text || item.text);
    setActiveTool('editText');
  };

  const applyTextEdit = () => {
    if (!selectedTextItem) return;
    const nextText = replacementText.trim();
    if (!nextText) {
      toast.error('Il testo sostitutivo non può essere vuoto.');
      return;
    }
    const existing = annotations.find((ann) => ann.type === 'textEdit' && ann.sourceTextId === selectedTextItem.id);
    const edit: Annotation = {
      id: existing?.id || Math.random().toString(36).slice(2, 10),
      page: pageNum,
      type: 'textEdit',
      sourceTextId: selectedTextItem.id,
      originalText: selectedTextItem.text,
      sourceX: existing?.sourceX ?? selectedTextItem.x,
      sourceY: existing?.sourceY ?? selectedTextItem.y,
      sourceWidth: existing?.sourceWidth ?? selectedTextItem.width,
      sourceHeight: existing?.sourceHeight ?? selectedTextItem.height,
      x: existing?.x ?? selectedTextItem.x,
      y: existing?.y ?? selectedTextItem.y,
      width: Math.max(selectedTextItem.width, nextText.length * selectedTextItem.fontSize * 0.56),
      height: Math.max(selectedTextItem.height, selectedTextItem.fontSize * 1.35),
      fontSize: existing?.fontSize ?? selectedTextItem.fontSize,
      text: nextText,
      color: '#111827',
    };
    pushHistory([...annotations.filter((ann) => ann.id !== existing?.id), edit]);
    setSelectedTextItem(null);
    setReplacementText('');
    setActiveTool('none');
    toast.success('Testo sostitutivo aggiunto. Puoi trascinarlo nella nuova posizione.');
  };

  const runPageOcr = async () => {
    if (!canvasRef.current) {
      toast.error('La pagina non è ancora pronta.');
      return;
    }
    setIsOcrLoading(true);
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      worker = await createWorker('ita+eng');
      const result = await worker.recognize(canvasRef.current);
      const words = (result.data.words || []).filter((word: any) => String(word.text || '').trim() && (word.confidence == null || word.confidence >= 25));
      const detected: PdfTextTarget[] = words.map((word: any, index: number) => {
        const box = word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
        const h = Math.max(8, box.y1 - box.y0);
        return {
          id: 'ocr-' + pageNum + '-' + index,
          page: pageNum,
          text: String(word.text).trim(),
          x: box.x0 / scale,
          y: box.y0 / scale,
          width: Math.max(4, (box.x1 - box.x0) / scale),
          height: h / scale,
          fontSize: Math.max(7, h / scale * 0.82),
          source: 'ocr' as const,
        };
      });
      if (!detected.length) {
        toast.error('Non è stato riconosciuto testo in questa pagina. Prova a ingrandirla o verifica la qualità della scansione.');
        return;
      }
      setOcrTargetsByPage((current) => ({ ...current, [pageNum]: detected }));
      setPageTextItems(detected);
      setTextSource('ocr');
      setActiveTool('editText');
      setSelectedTextItem(null);
      toast.success('Riconosciute ' + detected.length + ' parole. Tocca una parola per modificarla.');
    } catch (err) {
      console.error('OCR pagina PDF non riuscito:', err);
      toast.error('Riconoscimento OCR non riuscito. Controlla la connessione e riprova.');
    } finally {
      if (worker) await worker.terminate().catch(() => undefined);
      setIsOcrLoading(false);
    }
  };

  const improveSelectedTextWithAi = async () => {
    if (!selectedTextItem) return;
    setIsRewritingText(true);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rewrite',
          content: selectedTextItem.text,
          instruction: 'Correggi refusi e migliora la leggibilità del testo selezionato senza cambiarne il significato, i dati, le formule o i termini tecnici. Restituisci solo il testo sostitutivo.',
        }),
      });
      const payload = await response.json().catch(() => ({})) as { result?: string; error?: string; provider?: string; model?: string };
      if (!response.ok || typeof payload.result !== 'string' || !payload.result.trim()) {
        throw new Error(payload.error || 'L’AI non ha restituito una proposta utilizzabile.');
      }
      setReplacementText(payload.result.trim());
      setPageAiModel([payload.provider, payload.model].filter(Boolean).join(' · '));
      toast.success('Proposta AI pronta: controllala e premi “Applica testo”.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore durante la modifica AI.');
    } finally {
      setIsRewritingText(false);
    }
  };

  const askAiAboutPage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const pageText = pageTextItems.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    if (pageText.length < 2) {
      toast.error('Questa pagina non contiene testo selezionabile. Esegui prima l’OCR se è una scansione.');
      return;
    }
    if (pageAiPrompt.trim().length < 3) {
      toast.error('Scrivi una domanda per l’assistente.');
      return;
    }
    setIsPageAiLoading(true);
    setPageAiAnswer('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask', content: pageText.slice(0, 30000), instruction: pageAiPrompt.trim() }),
      });
      const payload = await response.json().catch(() => ({})) as { result?: string; error?: string; provider?: string; model?: string; fallbackUsed?: boolean };
      if (!response.ok || typeof payload.result !== 'string' || !payload.result.trim()) {
        throw new Error(payload.error || 'L’assistente non ha restituito una risposta.');
      }
      setPageAiAnswer(payload.result.trim());
      setPageAiModel([payload.provider, payload.model, payload.fallbackUsed ? 'fallback' : ''].filter(Boolean).join(' · '));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nell’assistente PDF.');
    } finally {
      setIsPageAiLoading(false);
    }
  };

  const handleDeleteAnnotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAnnotations = annotations.filter(a => a.id !== id);
    pushHistory(nextAnnotations);
    toast.success("Elemento rimosso.");
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'draw') return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    isDrawingRef.current = true;
    drawingPointsRef.current = [point];
    setDrawingPoints([point]);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in a few embedded browser contexts.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = (event.clientX - rect.left) / scale;
      const py = (event.clientY - rect.top) / scale;
      const offset = dragOffsetRef.current || { x: 0, y: 0 };
      setAnnotations((previous) => {
        const next = previous.map((ann) => {
          if (ann.id !== draggingId) return ann;
          const dx = px + offset.x - ann.x;
          const dy = py + offset.y - ann.y;
          return { ...ann, x: px + offset.x, y: py + offset.y, points: ann.type === 'draw' && ann.points ? ann.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) : ann.points };
        });
        draggedAnnotationsRef.current = next;
        return next;
      });
      return;
    }
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    };
    const nextPoints = [...drawingPointsRef.current, point];
    drawingPointsRef.current = nextPoints;
    setDrawingPoints(nextPoints);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingId) {
      if (draggedAnnotationsRef.current) pushHistory(draggedAnnotationsRef.current);
      draggedAnnotationsRef.current = null;
      dragOffsetRef.current = null;
      setDraggingId(null);
      return;
    }
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    let points = drawingPointsRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      points = [...points, {
        x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      }];
    }
    isDrawingRef.current = false;
    drawingPointsRef.current = [];
    setDrawingPoints([]);

    if (points.length < 2) return;
    const drawing: Annotation = {
      id: Math.random().toString(36).slice(2, 10),
      page: pageNum,
      type: 'draw',
      x: points[0].x / scale,
      y: points[0].y / scale,
      points: points.map((point) => ({ x: point.x / scale, y: point.y / scale })),
      color: inkColor,
      strokeWidth: 2.5,
    };
    pushHistory([...annotations, drawing]);
  };



  // Le sostituzioni sono overlay visivi: il testo originale incorporato può restare sotto.
  const handleSaveAnnotatedPdf = async () => {
    try {
      setIsExporting(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDocLib = await PDFDocument.load(arrayBuffer);
      const pages = pdfDocLib.getPages();
      const font = await pdfDocLib.embedFont(StandardFonts.Helvetica);
      const viewportCache = new Map<number, any>();
      const getViewport = async (pageNumber: number) => {
        if (!viewportCache.has(pageNumber)) {
          const sourcePage = await pdfDoc.getPage(pageNumber);
          viewportCache.set(pageNumber, sourcePage.getViewport({ scale: 1 }));
        }
        return viewportCache.get(pageNumber);
      };
      const mapRect = (viewport: any, x: number, y: number, width: number, height: number) => {
        const first = viewport.convertToPdfPoint(x, y);
        const second = viewport.convertToPdfPoint(x + width, y + height);
        return {
          x: Math.min(first[0], second[0]),
          y: Math.min(first[1], second[1]),
          width: Math.abs(second[0] - first[0]),
          height: Math.abs(second[1] - first[1]),
        };
      };
      const pdfPoint = (viewport: any, x: number, y: number) => {
        const point = viewport.convertToPdfPoint(x, y);
        return { x: point[0], y: point[1] };
      };

      for (const ann of annotations) {
        const targetPage = pages[ann.page - 1];
        if (!targetPage) continue;
        const viewport = await getViewport(ann.page);
        if (ann.type === 'textEdit') {
          if (typeof ann.sourceX === 'number' && typeof ann.sourceY === 'number') {
            const sourceRect = mapRect(viewport, ann.sourceX, ann.sourceY, Math.max(ann.sourceWidth || 0, 2), Math.max(ann.sourceHeight || ann.height || 10, 6));
            targetPage.drawRectangle({ ...sourceRect, color: rgb(1, 1, 1) });
          }
          const fontSize = Math.max(5, Math.min(48, ann.fontSize || 11));
          const baseline = pdfPoint(viewport, ann.x, ann.y + fontSize);
          targetPage.drawText(ann.text || '', {
            x: baseline.x, y: baseline.y, size: fontSize, font, color: rgb(0.08, 0.1, 0.15),
            maxWidth: Math.max(30, ann.width || 100),
          });
        } else if (ann.type === 'text') {
          const baseline = pdfPoint(viewport, ann.x, ann.y + 12);
          targetPage.drawText(ann.text || '', { x: baseline.x, y: baseline.y, size: 12, font, color: rgb(0.14, 0.39, 0.92) });
        } else if (ann.type === 'redact' || ann.type === 'highlight') {
          const rect = mapRect(viewport, ann.x, ann.y, ann.width || (ann.type === 'highlight' ? 140 : 100), ann.height || (ann.type === 'highlight' ? 18 : 15));
          if (ann.type === 'redact') {
            const hex = (ann.color || '#0f172a').replace('#', '');
            targetPage.drawRectangle({ ...rect, color: rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255) });
          } else {
            targetPage.drawRectangle({ ...rect, color: rgb(1, 0.85, 0.1), opacity: 0.38, borderColor: rgb(0.95, 0.65, 0), borderWidth: 0.5 });
          }
        } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
          const hex = (ann.color || '#2563eb').replace('#', '');
          const strokeColor = rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
          for (let i = 1; i < ann.points.length; i++) {
            targetPage.drawLine({ start: pdfPoint(viewport, ann.points[i - 1].x, ann.points[i - 1].y), end: pdfPoint(viewport, ann.points[i].x, ann.points[i].y), thickness: Math.max(0.5, (ann.strokeWidth || 2.5) / scale), color: strokeColor });
          }
        } else if (ann.type === 'stamp' || ann.type === 'sign') {
          const baseline = pdfPoint(viewport, ann.x, ann.y + 12);
          targetPage.drawText(ann.type === 'stamp' ? 'APPROVATO / VISTO' : 'FIRMATO', { x: baseline.x, y: baseline.y, size: 10, font, color: ann.type === 'stamp' ? rgb(0.86, 0.15, 0.15) : rgb(0.14, 0.39, 0.92) });
        }
      }

      const pdfBytes = await pdfDocLib.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Modificato_' + file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success('PDF modificato esportato.');
    } catch (err) {
      console.error('Export PDF non riuscito:', err);
      toast.error('Esportazione non riuscita. Un carattere non supportato dal font standard potrebbe richiedere una formulazione più semplice.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div data-md-pdf-annotator="true" className="flex flex-col h-full bg-slate-900 text-white relative select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-800 border-b border-slate-700 shadow-md">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold transition">Torna all'Editor</button>
          <span className="text-xs text-slate-300 font-medium truncate max-w-xs">{file.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 px-2 py-1.5 rounded-xl border border-slate-700 shadow-inner">
          <button onClick={handleUndo} disabled={historyStep < 0} title="Annulla" className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={historyStep >= history.length - 1} title="Ripristina" className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition">
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          <button onClick={() => setActiveTool('none')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'none' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Move className="w-3.5 h-3.5" /><span>Naviga</span>
          </button>
          <button onClick={() => { setActiveTool('text'); setSelectedTextItem(null); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${activeTool === 'text' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Edit3 className="w-3.5 h-3.5" /><span>Nota testo</span>
          </button>
          <button onClick={() => { setActiveTool('editText'); setSelectedTextItem(null); setPageAiAnswer(''); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${activeTool === 'editText' ? 'bg-violet-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`} title="Seleziona testo PDF, correggilo o spostalo">
            <Type className="w-3.5 h-3.5" /><span>Modifica testo</span>
          </button>
          <button onClick={() => { setIsPageAiOpen((open) => !open); setPageAiAnswer(''); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${isPageAiOpen ? 'bg-violet-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`} title="Fai una domanda sul testo della pagina corrente">
            <WandSparkles className="w-3.5 h-3.5" /><span>AI pagina</span>
          </button>
          <button onClick={runPageOcr} disabled={isOcrLoading} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition hover:bg-slate-800 text-slate-300 disabled:opacity-50" title="Riconosce le parole di una pagina scansionata">
            <ScanText className="w-3.5 h-3.5" /><span>{isOcrLoading ? 'OCR in corso…' : 'OCR pagina'}</span>
          </button>
          <button onClick={() => setActiveTool('draw')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'draw' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`} title="Disegna con penna, stilo o dito">
            <PenLine className="w-3.5 h-3.5" /><span>Penna</span>
          </button>
          <button onClick={() => setActiveTool('highlight')} title="Evidenzia una zona della pagina" className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition hover:bg-amber-500/20 text-amber-200"><Highlighter className="w-3.5 h-3.5" /><span>Evidenzia</span></button>
          {activeTool === 'text' && (
            <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
              Testo
              <input value={annotationDraftText} maxLength={400} onChange={(event) => setAnnotationDraftText(event.target.value)} className="w-36 rounded bg-slate-900 px-2 py-1 text-white outline-none focus:ring-1 focus:ring-teal-400" aria-label="Testo da aggiungere al PDF" />
              <span className="text-slate-400">poi tocca la pagina</span>
            </label>
          )}
          {activeTool === 'draw' && (
            <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
              Colore
              <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} className="h-5 w-6 cursor-pointer bg-transparent" aria-label="Colore della penna PDF" />
            </label>
          )}
          
          <div className="flex flex-wrap items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            <button title="Copertura visiva: non rimuove i dati originali dal PDF" onClick={() => setActiveTool('redact')} className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition ${activeTool === 'redact' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-700 text-slate-300'}`}>
              <ShieldAlert className="w-3.5 h-3.5" /><span>Copri (visivo)</span>
            </button>
            <select value={redactColor} onChange={(e) => setRedactColor(e.target.value)} className="bg-slate-900 text-xs text-slate-200 border border-slate-600 rounded px-1 py-0.5 outline-none cursor-pointer">
              <option value="#0f172a">Nero</option>
              <option value="#ffffff">Bianco</option>
              <option value="#dc2626">Rosso</option>
              <option value="#2563eb">Blu</option>
              <option value="#16a34a">Verde</option>
            </select>
          </div>

          <button onClick={() => setActiveTool('stamp')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'stamp' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Stamp className="w-3.5 h-3.5" /><span>+ Timbro</span>
          </button>
          <button onClick={() => setActiveTool('sign')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'sign' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <CheckCircle className="w-3.5 h-3.5" /><span>+ Firma</span>
          </button>
        </div>
        
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 hover:bg-slate-700 rounded-lg transition"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1.5 hover:bg-slate-700 rounded-lg transition" title="Ingrandisci"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={async () => { try { const page = await pdfDoc.getPage(pageNum); const width = page.getViewport({ scale: 1 }).width; const viewer = document.querySelector<HTMLElement>('[data-md-pdf-viewer="true"]'); if (viewer && width > 0) setScale(Math.max(0.5, Math.min(3, (viewer.clientWidth - 48) / width))); } catch { toast.error('Impossibile adattare la pagina alla larghezza.'); } }} className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700" title="Adatta alla larghezza disponibile">Adatta</button>
          
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          
          <button disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)} className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"><ChevronLeft className="w-4 h-4" /></button>
          <label className="inline-flex items-center gap-1 text-xs font-mono text-slate-200"><span>Pagina</span><input aria-label="Vai alla pagina PDF" type="number" min={1} max={numPages || 1} value={pageNum} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 1) setPageNum(Math.min(numPages || 1, Math.floor(value))); }} className="w-14 rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-center text-xs text-white outline-none focus:border-teal-400" /><span>di {numPages || 1}</span></label>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum(p => p + 1)} className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"><ChevronRight className="w-4 h-4" /></button>

          <button onClick={handleSaveAnnotatedPdf} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ml-2 shadow-lg transition disabled:opacity-50">
            <Download className="w-4 h-4" /><span>Salva PDF Modificato</span>
          </button>
        </div>
      </div>
      <div role="note" className="flex flex-wrap items-center gap-2 border-b border-amber-400/30 bg-amber-950/70 px-4 py-2 text-[11px] leading-4 text-amber-100"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-300"/><span><strong>Modifica testo:</strong> le correzioni coprono visivamente il testo precedente e aggiungono quello nuovo; il testo originale può rimanere incorporato nel PDF. Non usare questi strumenti per redigere dati sensibili.</span></div>
      {selectedTextItem && activeTool === 'editText' && (
        <form onSubmit={(event) => { event.preventDefault(); applyTextEdit(); }} className="flex flex-wrap items-end gap-2 border-b border-violet-400/30 bg-slate-800 px-3 py-3">
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-200">Testo originale · {textSource === 'ocr' ? 'riconosciuto via OCR' : 'selezionato dal PDF'}</label>
            <div className="max-w-full truncate rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-2 text-xs text-slate-300" title={selectedTextItem.text}>{selectedTextItem.text}</div>
          </div>
          <div className="min-w-48 flex-[2]">
            <label htmlFor="md-pdf-replacement" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-200">Testo sostitutivo</label>
            <input id="md-pdf-replacement" value={replacementText} onChange={(event) => setReplacementText(event.target.value)} maxLength={1200} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400" />
          </div>
          <button type="button" onClick={improveSelectedTextWithAi} disabled={isRewritingText} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-900/50 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-800 disabled:opacity-50"><WandSparkles className="h-3.5 w-3.5"/>{isRewritingText ? 'AI…' : 'Migliora con AI'}</button>
          <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500">Applica testo</button>
          <button type="button" onClick={() => { setSelectedTextItem(null); setReplacementText(''); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"><X className="h-3.5 w-3.5"/>Annulla</button>
          {pageAiModel && <span className="w-full text-[10px] text-slate-400">Ultimo modello AI: {pageAiModel}</span>}
        </form>
      )}
      {isPageAiOpen && (
        <form onSubmit={askAiAboutPage} className="grid gap-2 border-b border-violet-400/30 bg-slate-800 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
          <div>
            <label htmlFor="md-pdf-ai-question" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-200">Domanda sulla pagina {pageNum}</label>
            <textarea id="md-pdf-ai-question" rows={2} value={pageAiPrompt} onChange={(event) => setPageAiPrompt(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"/>
          </div>
          <div className="min-w-0 text-xs leading-5 text-slate-300">
            {isPageAiLoading ? 'L’AI sta analizzando il testo della pagina…' : pageAiAnswer || 'L’AI riceve il testo riconosciuto di questa pagina, non il file PDF completo.'}
            {pageAiModel && <div className="mt-1 text-[10px] text-slate-400">Modello: {pageAiModel}</div>}
          </div>
          <button type="submit" disabled={isPageAiLoading || isOcrLoading} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50"><WandSparkles className="h-4 w-4"/>{isPageAiLoading ? 'Analisi…' : 'Chiedi all’AI'}</button>
        </form>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-950">
        <aside className="hidden w-[4.25rem] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-slate-800 bg-slate-900 px-2 py-3 sm:flex" aria-label="Navigazione pagine PDF">
          {Array.from({ length: numPages }, (_, index) => index + 1).map((number) => (
            <button key={number} type="button" onClick={() => setPageNum(number)} aria-current={number === pageNum ? 'page' : undefined} className={'flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-[10px] transition ' + (number === pageNum ? 'border-teal-400 bg-teal-950 text-teal-100 ring-1 ring-teal-500/30' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700')} title={'Vai a pagina ' + number}>
              <FileText className="mb-0.5 h-3.5 w-3.5"/><span>{number}</span>
            </button>
          ))}
        </aside>
        <div data-md-pdf-viewer="true" className="min-w-0 flex-1 overflow-auto bg-slate-950 px-4 py-6 sm:px-8 sm:py-8">
        {loading ? (
          <div className="text-sm text-slate-400 animate-pulse font-medium">Caricamento anteprima PDF in corso...</div>
        ) : (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleCanvasClick}
            className="shadow-2xl border border-slate-700 bg-white relative cursor-crosshair rounded-lg overflow-hidden touch-none"
          >
            <canvas ref={canvasRef} className="block pointer-events-none" />
            <svg
              aria-hidden="true"
              className="absolute left-0 top-0 pointer-events-none z-20"
              width={canvasRef.current?.width || 0}
              height={canvasRef.current?.height || 0}
            >
              {annotations.filter((ann) => ann.page === pageNum && ann.type === 'draw' && ann.points && ann.points.length > 1).map((ann) => (
                <polyline
                  key={ann.id}
                  points={ann.points!.map((point) => `${point.x * scale},${point.y * scale}`).join(' ')}
                  fill="none"
                  stroke={ann.color || '#2563eb'}
                  strokeWidth={ann.strokeWidth || 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {activeTool === 'draw' && drawingPoints.length > 1 && (
                <polyline
                  points={drawingPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={inkColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>

            {annotations.filter((ann) => ann.page === pageNum && ann.type === 'textEdit').map((ann) => (
              <div key={ann.id + '-mask'} aria-hidden="true" className="pointer-events-none absolute z-[25] bg-white" style={{ left: ((ann.sourceX ?? ann.x) * scale) + 'px', top: ((ann.sourceY ?? ann.y) * scale) + 'px', width: (Math.max(ann.sourceWidth || 0, 2) * scale + 2) + 'px', height: (Math.max(ann.sourceHeight || ann.height || 10, 6) * scale + 2) + 'px' }} />
            ))}

            {activeTool === 'editText' && pageTextItems.filter((item) => item.page === pageNum).map((item) => (
              <button key={item.id} type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); beginTextEdit(item); }} title={'Modifica: ' + item.text} aria-label={'Seleziona testo: ' + item.text} style={{ left: item.x * scale + 'px', top: item.y * scale + 'px', width: Math.max(5, item.width * scale) + 'px', height: Math.max(7, item.height * scale) + 'px' }} className={'absolute z-40 overflow-hidden rounded-[2px] border text-transparent opacity-70 transition ' + (selectedTextItem?.id === item.id ? 'border-violet-300 bg-violet-300/50 ring-2 ring-violet-400' : 'border-violet-300/40 bg-violet-100/10 hover:border-violet-300 hover:bg-violet-300/35')}><span className="opacity-0">{item.text}</span></button>
            ))}

            {annotations.filter(a => a.page === pageNum).map(ann => (
              <div key={ann.id} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => {
                event.stopPropagation();
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                dragOffsetRef.current = { x: ann.x - (event.clientX - rect.left) / scale, y: ann.y - (event.clientY - rect.top) / scale };
                draggedAnnotationsRef.current = annotations;
                setDraggingId(ann.id);
                try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
              }}
                onDoubleClick={(event) => { event.stopPropagation(); if (ann.type !== 'text') return; const value = window.prompt('Modifica il testo dell’annotazione:', ann.text || ''); if (value !== null && value.trim()) pushHistory(annotations.map((item) => item.id === ann.id ? { ...item, text: value.trim() } : item)); }}
                style={{ left: (ann.x * scale) + 'px', top: (ann.y * scale) + 'px', ...(ann.type === 'highlight' || ann.type === 'redact' || ann.type === 'textEdit' ? { width: ((ann.width || (ann.type === 'highlight' ? 140 : 100)) * scale) + 'px', height: ((ann.height || (ann.type === 'highlight' ? 18 : 15)) * scale) + 'px', backgroundColor: ann.type === 'redact' ? (ann.color || '#0f172a') : ann.type === 'textEdit' ? '#ffffff' : undefined, fontSize: ann.type === 'textEdit' ? Math.max(7, (ann.fontSize || 11) * scale) + 'px' : undefined, lineHeight: ann.type === 'textEdit' ? Math.max(8, (ann.fontSize || 11) * scale * 1.2) + 'px' : undefined } : {}) }}
                title={ann.type === 'text' ? 'Trascina per spostare · doppio clic per modificare il testo' : 'Trascina per spostare · usa × per eliminare'}
                className={'absolute z-30 group ' + (ann.type === 'textEdit' ? 'cursor-move overflow-visible rounded-sm border border-dashed border-violet-400 bg-white px-0.5 text-slate-900 shadow-sm hover:ring-2 hover:ring-violet-400' : ann.type === 'highlight' ? 'cursor-move rounded-sm border border-amber-500 bg-yellow-300/40 hover:ring-2 hover:ring-amber-300' : ann.type === 'redact' ? 'cursor-move rounded-sm border border-slate-400 hover:ring-2 hover:ring-blue-400' : 'cursor-move px-2.5 py-1 rounded-lg shadow-xl border text-xs font-semibold flex items-center space-x-2 hover:ring-2 hover:ring-blue-400 transition-all bg-white text-slate-800 border-slate-300')}>
                {ann.type === 'text' && <span className="text-blue-700">✏️ {ann.text}</span>}
                {ann.type === 'textEdit' && <span className="block max-w-full whitespace-pre-wrap break-words text-slate-900">{ann.text}</span>}
                {ann.type === 'draw' && <span className="text-blue-700">✍️ Penna (trascinabile)</span>}
                {ann.type === 'highlight' && <span className="sr-only">Evidenziazione</span>}
                {ann.type === 'redact' && <span className="sr-only">Copertura visiva</span>}
                {ann.type === 'stamp' && <span className="text-red-600 font-bold border border-red-500 px-1.5 py-0.5 rounded bg-red-50">APPROVATO</span>}
                {ann.type === 'sign' && <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-300">✓ FIRMATO</span>}
                {ann.type !== 'highlight' && ann.type !== 'redact' && <button onClick={(event) => handleDeleteAnnotation(ann.id, event)} onPointerDown={(event) => event.stopPropagation()} title="Elimina" className="absolute -right-2 -top-2 z-50 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600 transition shadow">×</button>}
                {(ann.type === 'highlight' || ann.type === 'redact') && <button onClick={(event) => handleDeleteAnnotation(ann.id, event)} title="Elimina annotazione" className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600 transition shadow">×</button>}
              </div>
            ))}
          </div>
        )}
        </div>
        <aside className="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-800 bg-slate-900 p-3 xl:flex" aria-label="Pannello PDF">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Pagina corrente</p>
            <p className="mt-1 text-sm font-bold text-white">Pagina {pageNum} di {numPages}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{pageTextItems.length} elementi di testo {textSource === 'ocr' ? 'riconosciuti via OCR' : 'selezionabili'}.</p>
            {activeTool === 'editText' && <p className="mt-2 rounded-lg bg-violet-950/70 px-2 py-1.5 text-[10px] leading-4 text-violet-200">Tocca una parola evidenziata in viola per modificarla. Dopo l’applicazione, trascina il testo nuovo per riposizionarlo.</p>}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
            <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Modifiche</p><span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{annotations.length}</span></div>
            {annotations.length === 0 ? <p className="text-xs leading-5 text-slate-400">Le note, le coperture e le correzioni appariranno qui.</p> : (
              <div className="grid gap-1.5">
                {annotations.slice().reverse().slice(0, 18).map((ann) => (
                  <div key={ann.id} className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <button type="button" onClick={() => setPageNum(ann.page)} className="min-w-0 flex-1 text-left">
                      <span className="block text-[10px] font-bold text-teal-300">Pagina {ann.page}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-200">{ann.type === 'textEdit' ? (ann.originalText || 'Testo modificato') + ' → ' + (ann.text || '') : ann.type === 'text' ? ann.text : ann.type === 'redact' ? 'Copertura visiva' : ann.type === 'highlight' ? 'Evidenziazione' : ann.type === 'draw' ? 'Tratto a penna' : ann.type === 'stamp' ? 'Timbro' : 'Firma'}</span>
                    </button>
                    <button type="button" onClick={() => pushHistory(annotations.filter((item) => item.id !== ann.id))} className="rounded p-1 text-slate-400 hover:bg-rose-950 hover:text-rose-300" title="Elimina modifica" aria-label="Elimina modifica"><X className="h-3.5 w-3.5"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Limiti importanti</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-100/80">Le correzioni del testo coprono il vecchio contenuto con un riquadro bianco; non modificano gli oggetti originali del PDF. OCR e AI aiutano a riconoscere e riformulare il testo, ma il risultato va sempre controllato.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
