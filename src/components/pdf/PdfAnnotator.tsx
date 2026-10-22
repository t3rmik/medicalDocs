'use client'

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createWorker } from 'tesseract.js';
import toast from 'react-hot-toast';
import {
  MedicalDocsIcon,
  MedicalDocsDownload as Download,
  MedicalDocsChevronLeft as ChevronLeft,
  MedicalDocsChevronRight as ChevronRight,
  MedicalDocsZoomIn as ZoomIn,
  MedicalDocsZoomOut as ZoomOut,
  MedicalDocsEdit as Edit3,
  MedicalDocsShieldAlert as ShieldAlert,
  MedicalDocsStamp as Stamp,
  MedicalDocsCheckCircle as CheckCircle,
  MedicalDocsMove as Move,
  MedicalDocsUndo as Undo2,
  MedicalDocsRedo as Redo2,
  MedicalDocsPen as PenLine,
  MedicalDocsHighlighter as Highlighter,
  MedicalDocsSpark as Wand2,
  MedicalDocsType as Type,
  MedicalDocsClose as X,
  MedicalDocsDocument as FileText,
} from '@/components/icons/MedicalDocsIcons';
import { PageThumbnails } from './PageThumbnails';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfAnnotatorProps {
  file: File;
  onClose: () => void;
}

type ToolMode = 'none' | 'text' | 'editText' | 'redact' | 'stamp' | 'sign' | 'draw' | 'highlight';
type PdfPoint = { x: number; y: number; pressure?: number };
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
  sourceTextIds?: string[];
}


function groupTextItemsIntoLines(items: PdfTextTarget[]): PdfTextTarget[] {
  const ordered = [...items].sort((a, b) => {
    const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
    return Math.abs(dy) > 4 ? dy : a.x - b.x;
  });
  const rows: PdfTextTarget[][] = [];
  for (const item of ordered) {
    const center = item.y + item.height / 2;
    let matched: PdfTextTarget[] | null = null;
    let closest = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const rowCenter = row.reduce((sum, current) => sum + current.y + current.height / 2, 0) / row.length;
      const rowHeight = row.reduce((sum, current) => sum + current.height, 0) / row.length;
      const distance = Math.abs(center - rowCenter);
      if (distance <= Math.max(4, Math.min(12, Math.max(item.height, rowHeight) * 0.7)) && distance < closest) {
        matched = row;
        closest = distance;
      }
    }
    if (matched) matched.push(item); else rows.push([item]);
  }
  const lines: PdfTextTarget[] = [];
  for (const row of rows) {
    const horizontal = [...row].sort((a, b) => a.x - b.x);
    let segment: PdfTextTarget[] = [];
    const flush = () => {
      if (!segment.length) return;
      const left = Math.min(...segment.map((item) => item.x));
      const top = Math.min(...segment.map((item) => item.y));
      const right = Math.max(...segment.map((item) => item.x + item.width));
      const bottom = Math.max(...segment.map((item) => item.y + item.height));
      const sourceTextIds = segment.flatMap((item) => item.sourceTextIds?.length ? item.sourceTextIds : [item.id]);
      const text = segment.map((item) => item.text.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ').trim();
      if (text) lines.push({
        id: segment.length === 1 ? segment[0].id : 'line-' + sourceTextIds.join('-'),
        page: segment[0].page, text, x: left, y: top,
        width: Math.max(3, right - left), height: Math.max(5, bottom - top),
        fontSize: segment.reduce((sum, item) => sum + item.fontSize, 0) / segment.length,
        source: segment[0].source, sourceTextIds,
      });
      segment = [];
    };
    for (const item of horizontal) {
      const previous = segment[segment.length - 1];
      const gap = previous ? item.x - (previous.x + previous.width) : 0;
      const threshold = previous ? Math.max(18, ((previous.fontSize + item.fontSize) / 2) * 2.8) : Number.POSITIVE_INFINITY;
      if (previous && gap > threshold) flush();
      segment.push(item);
    }
    flush();
  }
  return lines.sort((a, b) => a.y - b.y || a.x - b.x);
}

interface Annotation {
  id: string;
  page: number;
  type: AnnotationType;
  x: number;
  y: number;
  text?: string;
  color?: string;
  points?: PdfPoint[];
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
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [redactColor, setRedactColor] = useState('#0f172a');
  const [inkColor, setInkColor] = useState('#2563eb');
  const [pdfInputMode, setPdfInputMode] = useState<'pen' | 'finger'>('pen');
  const [pageTextItems, setPageTextItems] = useState<PdfTextTarget[]>([]);
  const [ocrTargetsByPage, setOcrTargetsByPage] = useState<Record<number, PdfTextTarget[]>>({});
  const [textSource, setTextSource] = useState<'pdf' | 'ocr'>('pdf');
  const [selectedTextItem, setSelectedTextItem] = useState<PdfTextTarget | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionDidMoveRef = useRef(false);
  const selectionPointerTypeRef = useRef<string>('mouse');
  const selectedSourceIdsRef = useRef<string[]>([]);
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
  const dragStartAnnotationsRef = useRef<Annotation[] | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartClientRef = useRef<{ x: number; y: number } | null>(null);
  const dragDidMoveRef = useRef(false);
  const selectionPointerIdRef = useRef<number | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const drawingFrameRef = useRef<number | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<PdfPoint[]>([]);
  const drawingPointsRef = useRef<PdfPoint[]>([]);
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
    let isMounted = true
    const loadPdf = async () => {
      try {
        setLoading(true)
        setPdfDoc(null)
        const arrayBuffer = await file.arrayBuffer()
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

        // Fit the first page to the available reading area on phone/tablet.
        let fittedScale = 1.2
        try {
          const firstPage = await loadedPdf.getPage(1)
          const pageWidth = firstPage.getViewport({ scale: 1 }).width
          const viewer = document.querySelector<HTMLElement>('[data-md-pdf-viewer="true"]')
          const availableWidth = (viewer?.clientWidth || window.innerWidth - 48) - 48
          if (pageWidth > 0 && availableWidth > 0) {
            fittedScale = Math.max(0.5, Math.min(3, availableWidth / pageWidth))
          }
        } catch {
          // Keep the normal zoom if the viewer cannot be measured.
        }

        if (isMounted) {
          setScale(fittedScale)
          setPdfDoc(loadedPdf)
          setNumPages(loadedPdf.numPages)
          setLoading(false)
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Errore caricamento PDF Viewer:', err)
          toast.error('Impossibile caricare il visualizzatore PDF.')
          setLoading(false)
        }
      }
    }
    void loadPdf()
    return () => { isMounted = false }
  }, [file]);

  useEffect(() => {
    if (!pdfDoc) return;
    let isMounted = true;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
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
        // Await a narrowed non-null task; keep the outer reference only for effect cleanup.
        const currentRenderTask = page.render({ canvasContext: context, viewport });
        renderTask = currentRenderTask;
        await currentRenderTask.promise;
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
        setPageTextItems(groupTextItemsIntoLines(ocrTargets?.length ? ocrTargets : targets));
        setTextSource(ocrTargets?.length ? 'ocr' : 'pdf');
        setSelectedTextItem(null);
        setReplacementText('');
      } catch (err) {
        const errorName = err && typeof err === 'object' && 'name' in err ? String((err as { name?: unknown }).name) : ''
        if (errorName !== 'RenderingCancelledException') console.error("Errore render pagina PDF:", err);
      }
    };
    void renderPage();
    return () => {
      isMounted = false;
      renderTask?.cancel();
    };
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

  const finishTextSelection = (start: { x: number; y: number }, end: { x: number; y: number }, moved: boolean) => {
    const isTap = !moved || (Math.abs(end.x - start.x) < 7 && Math.abs(end.y - start.y) < 7);
    const padding = isTap ? 0 : 5;
    const left = (Math.min(start.x, end.x) - padding) / scale;
    const top = (Math.min(start.y, end.y) - padding) / scale;
    const right = (Math.max(start.x, end.x) + padding) / scale;
    const bottom = (Math.max(start.y, end.y) + padding) / scale;
    let chosen = pageTextItems.filter((item) =>
      item.x < right && item.x + item.width > left && item.y < bottom && item.y + item.height > top
    );

    if (isTap) {
      const x = end.x / scale;
      const y = end.y / scale;
      // Test against every line's full rectangle: a tap at the beginning/end of
      // a long line must select it just like a tap near its center.
      let hit = pageTextItems.find((item) =>
        x >= item.x - 2 && x <= item.x + item.width + 2 &&
        y >= item.y - 3 && y <= item.y + item.height + 3
      );
      if (!hit) {
        const nearest = [...pageTextItems].map((item) => {
          const dx = Math.max(item.x - x, 0, x - (item.x + item.width));
          const dy = Math.max(item.y - y, 0, y - (item.y + item.height));
          return { item, distance: Math.hypot(dx, dy) };
        }).sort((a, b) => a.distance - b.distance)[0];
        if (nearest && nearest.distance <= Math.max(20, 24 / scale)) hit = nearest.item;
      }
      chosen = hit ? [hit] : [];
    }

    if (!chosen.length) {
      if (!multiSelectMode) {
        setSelectedTextItem(null);
        selectedSourceIdsRef.current = [];
        setReplacementText('');
      }
      setSelectionBox(null);
      return;
    }

    if (multiSelectMode && isTap) {
      const hitIds = chosen[0].sourceTextIds?.length ? chosen[0].sourceTextIds : [chosen[0].id];
      const previous = selectedSourceIdsRef.current;
      selectedSourceIdsRef.current = previous.some((id) => hitIds.includes(id))
        ? previous.filter((id) => !hitIds.includes(id))
        : [...previous, ...hitIds];
      chosen = pageTextItems.filter((item) =>
        (item.sourceTextIds?.length ? item.sourceTextIds : [item.id]).some((id) => selectedSourceIdsRef.current.includes(id))
      );
      if (!chosen.length) {
        setSelectedTextItem(null);
        setReplacementText('');
        setSelectionBox(null);
        return;
      }
    } else if (!multiSelectMode || !isTap) {
      selectedSourceIdsRef.current = chosen.flatMap((item) => item.sourceTextIds?.length ? item.sourceTextIds : [item.id]);
    }

    chosen.sort((a, b) => {
      const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
      return Math.abs(dy) > Math.max(4, (a.height + b.height) * 0.25) ? dy : a.x - b.x;
    });
    const minX = Math.min(...chosen.map((item) => item.x));
    const minY = Math.min(...chosen.map((item) => item.y));
    const maxX = Math.max(...chosen.map((item) => item.x + item.width));
    const maxY = Math.max(...chosen.map((item) => item.y + item.height));
    let combinedText = '';
    let previousLineY: number | null = null;
    for (const item of chosen) {
      const centerY = item.y + item.height / 2;
      if (previousLineY !== null && Math.abs(centerY - previousLineY) > Math.max(item.height, 8) * 0.8) {
        combinedText = combinedText.trimEnd() + '\n';
      } else if (combinedText && !/[\s\n]$/.test(combinedText)) {
        combinedText += ' ';
      }
      combinedText += item.text.trim();
      previousLineY = centerY;
    }
    setSelectedTextItem({
      id: chosen.length === 1 ? chosen[0].id : 'selection-' + pageNum + '-' + selectedSourceIdsRef.current.join('-'),
      page: pageNum, text: combinedText.trim(), x: minX, y: minY,
      width: Math.max(6, maxX - minX), height: Math.max(8, maxY - minY),
      fontSize: Math.max(7, chosen.reduce((sum, item) => sum + item.fontSize, 0) / chosen.length),
      source: textSource, sourceTextIds: selectedSourceIdsRef.current,
    });
    setReplacementText(combinedText.trim());
    setSelectionBox(null);
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
      const grouped = groupTextItemsIntoLines(detected);
      setOcrTargetsByPage((current) => ({ ...current, [pageNum]: grouped }));
      setPageTextItems(grouped);
      setTextSource('ocr');
      setActiveTool('editText');
      setSelectedTextItem(null);
      toast.success('Riconosciute ' + detected.length + ' parole in ' + grouped.length + ' righe. Tocca una riga oppure attiva Multi-riga per selezionarne diverse.');
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
          instruction: 'Correggi e, se utile, riorganizza il testo selezionato come un passaggio unico e scorrevole. Mantieni significato, dati, formule, termini tecnici e lingua originale. Se ci sono più capoversi, conservali. Restituisci soltanto il testo sostitutivo, senza premesse.',
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
    if (selectionStartRef.current && selectionPointerIdRef.current !== event.pointerId) return
    if (isDrawingRef.current && drawingPointerIdRef.current !== event.pointerId) return
    if (activeTool === 'editText') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const start = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      selectionStartRef.current = start;
      selectionDidMoveRef.current = false;
      selectionPointerTypeRef.current = event.pointerType;
      selectionPointerIdRef.current = event.pointerId;
      setSelectionBox({ x: start.x, y: start.y, width: 0, height: 0 });
      if (event.pointerType !== 'touch') {
        event.preventDefault();
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
      }
      return;
    }
    if (activeTool !== 'draw') return;
    if (event.pointerType === 'touch' && pdfInputMode !== 'finger') return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point: PdfPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top, ...(event.pointerType === 'pen' && event.pressure > 0 ? { pressure: event.pressure } : {}) };
    isDrawingRef.current = true;
    drawingPointerIdRef.current = event.pointerId;
    drawingPointsRef.current = [point];
    setDrawingPoints([point]);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may be unavailable in a few embedded browser contexts.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (selectionStartRef.current) {
      if (selectionPointerIdRef.current !== null && event.pointerId !== selectionPointerIdRef.current) return
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const start = selectionStartRef.current;
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      if (selectionPointerTypeRef.current === 'touch') {
        if (Math.abs(dx) + Math.abs(dy) > 9) {
          selectionStartRef.current = null
          selectionPointerIdRef.current = null
          selectionDidMoveRef.current = false
          selectionPointerTypeRef.current = 'mouse'
          setSelectionBox(null)
        }
        return;
      }
      if (Math.abs(dx) + Math.abs(dy) > 5) selectionDidMoveRef.current = true;
      setSelectionBox({ x: Math.min(start.x, current.x), y: Math.min(start.y, current.y), width: Math.abs(dx), height: Math.abs(dy) });
      return;
    }
    if (draggingId) {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return
      if (dragStartClientRef.current && Math.hypot(event.clientX - dragStartClientRef.current.x, event.clientY - dragStartClientRef.current.y) > 3) dragDidMoveRef.current = true
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
          return { ...ann, x: px + offset.x, y: py + offset.y, points: ann.type === 'draw' && ann.points ? ann.points.map((point) => ({ ...point, x: point.x + dx, y: point.y + dy })) : ann.points };
        });
        draggedAnnotationsRef.current = next;
        return next;
      });
      return;
    }
    if (!isDrawingRef.current || (drawingPointerIdRef.current !== null && event.pointerId !== drawingPointerIdRef.current)) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point: PdfPoint = {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      ...(event.pointerType === 'pen' && event.pressure > 0 ? { pressure: event.pressure } : {}),
    };
    drawingPointsRef.current.push(point)
    if (drawingFrameRef.current === null) {
      drawingFrameRef.current = window.requestAnimationFrame(() => {
        drawingFrameRef.current = null
        if (isDrawingRef.current) setDrawingPoints([...drawingPointsRef.current])
      })
    }
  };

  const resetDrawingPreview = () => {
    if (drawingFrameRef.current !== null) {
      window.cancelAnimationFrame(drawingFrameRef.current)
      drawingFrameRef.current = null
    }
    isDrawingRef.current = false
    drawingPointerIdRef.current = null
    drawingPointsRef.current = []
    setDrawingPoints([])
  }

  const clearSelectionGesture = () => {
    selectionStartRef.current = null
    selectionPointerIdRef.current = null
    selectionDidMoveRef.current = false
    selectionPointerTypeRef.current = 'mouse'
    setSelectionBox(null)
  }

  const clearAnnotationDrag = () => {
    draggedAnnotationsRef.current = null
    dragStartAnnotationsRef.current = null
    dragOffsetRef.current = null
    dragStartClientRef.current = null
    dragPointerIdRef.current = null
    dragDidMoveRef.current = false
    setDraggingId(null)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (selectionStartRef.current) {
      if (selectionPointerIdRef.current !== null && event.pointerId !== selectionPointerIdRef.current) return
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        finishTextSelection(selectionStartRef.current, { x: event.clientX - rect.left, y: event.clientY - rect.top }, selectionDidMoveRef.current)
      }
      clearSelectionGesture()
      return
    }
    if (draggingId) {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return
      if (dragDidMoveRef.current && draggedAnnotationsRef.current) pushHistory(draggedAnnotationsRef.current)
      else if (dragStartAnnotationsRef.current) setAnnotations(dragStartAnnotationsRef.current)
      clearAnnotationDrag()
      return
    }
    if (!isDrawingRef.current || (drawingPointerIdRef.current !== null && event.pointerId !== drawingPointerIdRef.current)) return
    event.preventDefault()
    const canvas = canvasRef.current
    const points = [...drawingPointsRef.current]
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      points.push({
        x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
        ...(event.pointerType === 'pen' && event.pressure > 0 ? { pressure: event.pressure } : {}),
      })
    }
    resetDrawingPreview()

    if (points.length < 2) return
    const drawing: Annotation = {
      id: Math.random().toString(36).slice(2, 10),
      page: pageNum,
      type: 'draw',
      x: points[0].x / scale,
      y: points[0].y / scale,
      points: points.map((point) => ({ x: point.x / scale, y: point.y / scale })),
      color: inkColor,
      strokeWidth: 2.5,
    }
    pushHistory([...annotations, drawing])
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (selectionStartRef.current && (selectionPointerIdRef.current === null || event.pointerId === selectionPointerIdRef.current)) {
      clearSelectionGesture()
      return
    }
    if (draggingId && (dragPointerIdRef.current === null || event.pointerId === dragPointerIdRef.current)) {
      if (dragStartAnnotationsRef.current) setAnnotations(dragStartAnnotationsRef.current)
      clearAnnotationDrag()
      return
    }
    if (isDrawingRef.current && (drawingPointerIdRef.current === null || event.pointerId === drawingPointerIdRef.current)) {
      resetDrawingPreview()
    }
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
            const currentPoint = ann.points[i]
            const pressureFactor = typeof currentPoint.pressure === 'number' && currentPoint.pressure > 0 ? 0.55 + currentPoint.pressure * 0.9 : 1
            targetPage.drawLine({ start: pdfPoint(viewport, ann.points[i - 1].x, ann.points[i - 1].y), end: pdfPoint(viewport, currentPoint.x, currentPoint.y), thickness: Math.max(0.5, ((ann.strokeWidth || 2.5) * pressureFactor) / scale), color: strokeColor });
          }
        } else if (ann.type === 'stamp' || ann.type === 'sign') {
          const baseline = pdfPoint(viewport, ann.x, ann.y + 12);
          targetPage.drawText(ann.type === 'stamp' ? 'APPROVATO / VISTO' : 'FIRMATO', { x: baseline.x, y: baseline.y, size: 10, font, color: ann.type === 'stamp' ? rgb(0.86, 0.15, 0.15) : rgb(0.14, 0.39, 0.92) });
        }
      }

      const pdfBytes = await pdfDocLib.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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
    <div data-md-pdf-annotator="true" data-md-pdf-tools-open={mobileToolsOpen ? 'true' : 'false'} className="md-pdf-workbench flex flex-col h-full bg-slate-900 text-white relative select-none">
      <div data-md-pdf-toolbar="true" className="flex max-h-[42dvh] shrink-0 flex-wrap items-center justify-between gap-2 overflow-y-auto border-b border-slate-700 bg-slate-800 px-3 py-2.5 shadow-md sm:max-h-none sm:overflow-visible">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold transition">Torna all'Editor</button>
          <span className="text-xs text-slate-300 font-medium truncate max-w-xs">{file.name}</span>
          <button type="button" data-md-pdf-mobile-toggle="true" onClick={() => setMobileToolsOpen((open) => !open)} aria-expanded={mobileToolsOpen} aria-label={mobileToolsOpen ? 'Nascondi strumenti PDF' : 'Mostra strumenti PDF'} className="md-pdf-mobile-toggle">
            <MedicalDocsIcon name={mobileToolsOpen ? 'close' : 'outline'} size={17} />
            <span>{mobileToolsOpen ? 'Chiudi' : 'Strumenti PDF'}</span>
          </button>
        </div>

        <div data-md-pdf-tools="true" className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain bg-slate-900/90 px-2 py-1.5 rounded-xl border border-slate-700 shadow-inner sm:w-auto xl:flex-wrap [&>button]:shrink-0 [&>label]:shrink-0">
          <button onClick={handleUndo} disabled={historyStep < 0} title="Annulla" className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={handleRedo} disabled={historyStep >= history.length - 1} title="Ripristina" className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-300 transition">
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          <button type="button" aria-pressed={activeTool === 'none'} onClick={() => setActiveTool('none')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'none' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Move className="w-3.5 h-3.5" /><span>Naviga</span>
          </button>
          <button type="button" aria-pressed={activeTool === 'text'} onClick={() => { setActiveTool('text'); setSelectedTextItem(null); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${activeTool === 'text' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Edit3 className="w-3.5 h-3.5" /><span>Nota testo</span>
          </button>
          <button type="button" aria-pressed={activeTool === 'editText'} onClick={() => { setActiveTool('editText'); setSelectedTextItem(null); setPageAiAnswer(''); }} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${activeTool === 'editText' ? 'bg-violet-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`} title="Seleziona testo PDF, correggilo o spostalo">
            <Type className="w-3.5 h-3.5" /><span>Modifica testo</span>
          </button>
          <button type="button" aria-pressed={multiSelectMode} onClick={() => { setMultiSelectMode((current) => !current); selectedSourceIdsRef.current = []; setSelectedTextItem(null); setReplacementText(''); }} className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${multiSelectMode ? 'bg-amber-500 text-slate-950' : 'hover:bg-slate-800 text-slate-300'}`} title="Su telefono attivalo e tocca più righe una dopo l’altra">Multi-riga {multiSelectMode ? 'ON' : 'OFF'}</button>
          <button aria-pressed={isPageAiOpen} onClick={() => { setIsPageAiOpen((open) => !open); setPageAiAnswer(''); }} className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${isPageAiOpen ? 'bg-violet-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`} title="Fai una domanda sul testo della pagina corrente">
            <MedicalDocsIcon name="spark" size={15} /><span>AI pagina</span>
          </button>
          <button onClick={runPageOcr} disabled={isOcrLoading} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition hover:bg-slate-800 text-slate-300 disabled:opacity-50" title="Riconosce le parole di una pagina scansionata">
            <MedicalDocsIcon name="scan" size={15} /><span>{isOcrLoading ? 'OCR in corso…' : 'OCR pagina'}</span>
          </button>
          <button type="button" aria-pressed={activeTool === 'draw'} onClick={() => setActiveTool('draw')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'draw' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`} title="Disegna con penna, stilo o dito">
            <MedicalDocsIcon name="pen" size={15} /><span>Penna</span>
          </button>
          <button type="button" aria-pressed={activeTool === 'highlight'} onClick={() => setActiveTool('highlight')} title="Evidenzia una zona della pagina" className="px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition hover:bg-amber-500/20 text-amber-200"><Highlighter className="w-3.5 h-3.5" /><span>Evidenzia</span></button>
          {activeTool === 'text' && (
            <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
              Testo
              <input value={annotationDraftText} maxLength={400} onChange={(event) => setAnnotationDraftText(event.target.value)} className="w-36 rounded bg-slate-900 px-2 py-1 text-white outline-none focus:ring-1 focus:ring-teal-400" aria-label="Testo da aggiungere al PDF" />
              <span className="text-slate-400">poi tocca la pagina</span>
            </label>
          )}
          {activeTool === 'draw' && (
            <div data-md-pdf-input-mode="true" className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200">
              <label className="flex min-h-10 items-center gap-2">
                Colore
                <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} className="h-8 w-9 cursor-pointer rounded bg-transparent" aria-label="Colore della penna PDF" />
              </label>
              <label className="flex min-h-10 items-center gap-2 rounded-lg px-1.5 py-1">
                <input type="checkbox" checked={pdfInputMode === 'finger'} onChange={(e) => setPdfInputMode(e.target.checked ? 'finger' : 'pen')} className="h-4 w-4 accent-teal-400" aria-label="Consenti il disegno con il dito" />
                Disegna col dito
              </label>
              <span className="text-[10px] text-slate-400">{pdfInputMode === 'pen' ? 'Stilo scrive · dito scorre' : 'Dito e stilo scrivono'}</span>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            <button type="button" aria-pressed={activeTool === 'redact'} title="Copertura visiva: non rimuove i dati originali dal PDF" onClick={() => setActiveTool('redact')} className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition ${activeTool === 'redact' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-700 text-slate-300'}`}>
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

          <button type="button" aria-pressed={activeTool === 'stamp'} onClick={() => setActiveTool('stamp')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'stamp' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Stamp className="w-3.5 h-3.5" /><span>+ Timbro</span>
          </button>
          <button type="button" aria-pressed={activeTool === 'sign'} onClick={() => setActiveTool('sign')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'sign' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <CheckCircle className="w-3.5 h-3.5" /><span>+ Firma</span>
          </button>
        </div>
        
        <div data-md-pdf-navigation-controls="true" className="flex min-w-0 flex-wrap items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} aria-label="Riduci ingrandimento PDF" className="min-h-11 min-w-11 p-1.5 hover:bg-slate-700 rounded-lg transition"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} aria-label="Aumenta ingrandimento PDF" className="min-h-11 min-w-11 p-1.5 hover:bg-slate-700 rounded-lg transition" title="Ingrandisci"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={async () => { try { const page = await pdfDoc.getPage(pageNum); const width = page.getViewport({ scale: 1 }).width; const viewer = document.querySelector<HTMLElement>('[data-md-pdf-viewer="true"]'); if (viewer && width > 0) setScale(Math.max(0.5, Math.min(3, (viewer.clientWidth - 48) / width))); } catch { toast.error('Impossibile adattare la pagina alla larghezza.'); } }} className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-700" title="Adatta alla larghezza disponibile">Adatta</button>
          
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          
          <button disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)} aria-label="Pagina precedente" className="min-h-11 min-w-11 p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"><ChevronLeft className="w-4 h-4" /></button>
          <label className="inline-flex items-center gap-1 text-xs font-mono text-slate-200"><span>Pagina</span><input aria-label="Vai alla pagina PDF" type="number" min={1} max={numPages || 1} value={pageNum} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 1) setPageNum(Math.min(numPages || 1, Math.floor(value))); }} className="w-14 rounded border border-slate-600 bg-slate-900 px-1.5 py-1 text-center text-xs text-white outline-none focus:border-teal-400" /><span>di {numPages || 1}</span></label>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum(p => p + 1)} aria-label="Pagina successiva" className="min-h-11 min-w-11 p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"><ChevronRight className="w-4 h-4" /></button>

          <button onClick={handleSaveAnnotatedPdf} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ml-2 shadow-lg transition disabled:opacity-50">
            <Download className="w-4 h-4" /><span>Salva PDF Modificato</span>
          </button>
        </div>
      </div>
      <div role="note" className="shrink-0 border-b border-amber-400/30 bg-amber-950/70 px-3 py-2 text-[11px] leading-4 text-amber-100"><ShieldAlert className="mr-1 inline h-3.5 w-3.5 text-amber-300"/><strong>Modifica visiva:</strong> il vecchio testo viene coperto e quello nuovo sovrapposto; il contenuto originale può restare nel PDF. Non è redazione sicura.</div>
      {selectedTextItem && activeTool === 'editText' && (
        <form onSubmit={(event) => { event.preventDefault(); applyTextEdit(); }} data-md-pdf-text-editor="true" className="flex flex-wrap items-end gap-2 border-b border-violet-400/30 bg-slate-800 px-3 py-3">
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-200">Testo originale · {textSource === 'ocr' ? 'riconosciuto via OCR' : 'selezionato dal PDF'}</label>
            <div className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm leading-5 text-slate-300" title={selectedTextItem.text}>{selectedTextItem.text}</div>
          </div>
          <div className="min-w-48 flex-[2]">
            <label htmlFor="md-pdf-replacement" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-200">Testo sostitutivo</label>
            <textarea id="md-pdf-replacement" rows={4} value={replacementText} onChange={(event) => setReplacementText(event.target.value)} maxLength={5000} className="min-h-28 w-full resize-y rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-base leading-6 text-white outline-none focus:border-violet-400" placeholder="Modifica qui l’intera frase o il paragrafo selezionato…" />
          </div>
          <button type="button" onClick={improveSelectedTextWithAi} disabled={isRewritingText} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-900/50 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-800 disabled:opacity-50"><MedicalDocsIcon name="spark" size={15} />{isRewritingText ? 'AI…' : 'Migliora con AI'}</button>
          <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500">Applica testo</button>
          <button type="button" onClick={() => { setSelectedTextItem(null); setReplacementText(''); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"><X className="h-3.5 w-3.5"/>Annulla</button>
          {pageAiModel && <span className="w-full text-[10px] text-slate-400">Ultimo modello AI: {pageAiModel}</span>}
        </form>
      )}
      {isPageAiOpen && (
        <form data-md-pdf-ai-form="true" onSubmit={askAiAboutPage} className="grid gap-2 border-b border-violet-400/30 bg-slate-800 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
          <div>
            <label htmlFor="md-pdf-ai-question" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-200">Domanda sulla pagina {pageNum}</label>
            <textarea id="md-pdf-ai-question" rows={2} value={pageAiPrompt} onChange={(event) => setPageAiPrompt(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"/>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-violet-200">Risposta dell’assistente</p>{pageAiModel && <span className="text-[10px] text-slate-400">Modello: {pageAiModel}</span>}</div>
            {isPageAiLoading ? <p className="text-sm leading-6 text-slate-300">L’AI sta analizzando il testo della pagina…</p> : pageAiAnswer ? (
              <div data-md-pdf-ai-answer="true" className="max-h-[38dvh] overflow-y-auto whitespace-pre-wrap break-words text-left text-base leading-7 text-slate-100">{pageAiAnswer}</div>
            ) : <p className="text-sm leading-6 text-slate-400">L’AI riceve il testo riconosciuto di questa pagina, non il file PDF completo. La risposta apparirà qui in un’area ampia e leggibile.</p>}
          </div>
          <button type="submit" disabled={isPageAiLoading || isOcrLoading} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50"><MedicalDocsIcon name="spark" size={17} />{isPageAiLoading ? 'Analisi…' : 'Chiedi all’AI'}</button>
        </form>
      )}
      <div data-md-pdf-work-area="true" className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-950">
        <PageThumbnails pdfDoc={pdfDoc} totalPages={numPages} currentPage={pageNum} onPageSelect={setPageNum} />
        <div data-md-pdf-viewer="true" className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-slate-950 px-2 py-4 sm:px-8 sm:py-8">
        {loading ? (
          <div className="text-sm text-slate-400 animate-pulse font-medium">Caricamento anteprima PDF in corso...</div>
        ) : (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handlePointerCancel}
            onClick={handleCanvasClick}
            className={'shadow-2xl border border-slate-700 bg-white relative cursor-crosshair rounded-lg overflow-hidden ' + (activeTool === 'draw' && pdfInputMode === 'finger' ? 'touch-none' : 'touch-pan-y')}
          >
            <canvas ref={canvasRef} className="block pointer-events-none" />
            <svg
              aria-hidden="true"
              className="absolute left-0 top-0 pointer-events-none z-20"
              width={canvasRef.current?.width || 0}
              height={canvasRef.current?.height || 0}
            >
              {annotations.filter((ann) => ann.page === pageNum && ann.type === 'draw' && ann.points && ann.points.length > 1).map((ann) => (
                <g key={ann.id}>
                  {ann.points!.slice(1).map((point, index) => {
                    const previous = ann.points![index]
                    const pressureFactor = typeof point.pressure === 'number' && point.pressure > 0 ? 0.55 + point.pressure * 0.9 : 1
                    return <line key={index} x1={previous.x * scale} y1={previous.y * scale} x2={point.x * scale} y2={point.y * scale} fill="none" stroke={ann.color || '#2563eb'} strokeWidth={(ann.strokeWidth || 2.5) * pressureFactor} strokeLinecap="round" strokeLinejoin="round" />
                  })}
                </g>
              ))}
              {activeTool === 'draw' && drawingPoints.length > 1 && (
                <g>
                  {drawingPoints.slice(1).map((point, index) => {
                    const previous = drawingPoints[index]
                    const pressureFactor = typeof point.pressure === 'number' && point.pressure > 0 ? 0.55 + point.pressure * 0.9 : 1
                    return <line key={index} x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} fill="none" stroke={inkColor} strokeWidth={2.5 * pressureFactor} strokeLinecap="round" strokeLinejoin="round" />
                  })}
                </g>
              )}
            </svg>

            {annotations.filter((ann) => ann.page === pageNum && ann.type === 'textEdit').map((ann) => (
              <div key={ann.id + '-mask'} aria-hidden="true" className="pointer-events-none absolute z-[25] bg-white" style={{ left: ((ann.sourceX ?? ann.x) * scale) + 'px', top: ((ann.sourceY ?? ann.y) * scale) + 'px', width: (Math.max(ann.sourceWidth || 0, 2) * scale + 2) + 'px', height: (Math.max(ann.sourceHeight || ann.height || 10, 6) * scale + 2) + 'px' }} />
            ))}

            {activeTool === 'editText' && pageTextItems.filter((item) => item.page === pageNum).map((item) => {
              const selectedIds = selectedTextItem?.sourceTextIds || [];
              const itemIds = item.sourceTextIds?.length ? item.sourceTextIds : [item.id];
              const selected = selectedIds.some((id) => itemIds.includes(id));
              return <div key={item.id} aria-hidden="true" title={item.text} style={{ left: item.x * scale + 'px', top: item.y * scale + 'px', width: Math.max(5, item.width * scale) + 'px', height: Math.max(7, item.height * scale) + 'px' }} className={'pointer-events-none absolute z-40 overflow-hidden rounded-[2px] border transition ' + (selected ? 'border-violet-300 bg-violet-300/45 ring-2 ring-violet-400' : 'border-violet-300/35 bg-violet-100/10')} />;
            })}
            {selectionBox && <div aria-hidden="true" className="pointer-events-none absolute z-50 border-2 border-violet-400 bg-violet-400/20" style={{ left: selectionBox.x + 'px', top: selectionBox.y + 'px', width: Math.max(2, selectionBox.width) + 'px', height: Math.max(2, selectionBox.height) + 'px' }} />}

            {annotations.filter(a => a.page === pageNum).map(ann => (
              <div key={ann.id} data-md-annotation="true" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => {
                event.stopPropagation();
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                dragOffsetRef.current = { x: ann.x - (event.clientX - rect.left) / scale, y: ann.y - (event.clientY - rect.top) / scale };
                dragStartAnnotationsRef.current = annotations;
                draggedAnnotationsRef.current = annotations;
                dragPointerIdRef.current = event.pointerId;
                dragStartClientRef.current = { x: event.clientX, y: event.clientY };
                dragDidMoveRef.current = false;
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
                {ann.type !== 'highlight' && ann.type !== 'redact' && <button onClick={(event) => handleDeleteAnnotation(ann.id, event)} onPointerDown={(event) => event.stopPropagation()} data-md-annotation-delete="true" title="Elimina" aria-label="Elimina annotazione" className="absolute -right-2 -top-2 z-50 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 hover:bg-red-600 transition shadow">×</button>}
                {(ann.type === 'highlight' || ann.type === 'redact') && <button onClick={(event) => handleDeleteAnnotation(ann.id, event)} onPointerDown={(event) => event.stopPropagation()} data-md-annotation-delete="true" title="Elimina annotazione" aria-label="Elimina annotazione" className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 hover:bg-red-600 transition shadow">×</button>}
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
