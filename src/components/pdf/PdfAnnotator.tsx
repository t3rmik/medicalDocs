'use client'

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Edit3, ShieldAlert, Stamp, CheckCircle, Move, Undo2, Redo2, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfAnnotatorProps {
  file: File;
  onClose: () => void;
}

type ToolMode = 'none' | 'text' | 'redact' | 'stamp' | 'sign' | 'draw';

interface Annotation {
  id: string;
  page: number;
  type: ToolMode;
  x: number;
  y: number;
  text?: string;
  color?: string;
  points?: Array<{ x: number; y: number }>;
  strokeWidth?: number;
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
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const drawingPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const isDrawingRef = useRef(false);
  
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const [draggingId, setDraggingId] = useState<string | null>(null);
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
      } catch (err) {
        console.error("Errore render pagina PDF:", err);
      }
    };
    renderPage();
    return () => { isMounted = false; };
  }, [pdfDoc, pageNum, scale]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'none') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let textVal = '';
    if (activeTool === 'text') {
      textVal = prompt("Inserisci il testo da aggiungere:", "Appunto di studio") || '';
      if (!textVal) return;
    }

    const newAnn: Annotation = {
      id: Math.random().toString(36).substring(2, 9),
      page: pageNum,
      type: activeTool,
      x,
      y,
      text: textVal,
      color: redactColor
    };

    const nextAnnotations = [...annotations, newAnn];
    pushHistory(nextAnnotations);
    toast.success("Elemento aggiunto con successo!");
    setActiveTool('none');
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
      x: points[0].x,
      y: points[0].y,
      points,
      color: inkColor,
      strokeWidth: 2.5,
    };
    pushHistory([...annotations, drawing]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAnnotations(prev => prev.map(ann => {
      if (ann.id === draggingId) {
        return { ...ann, x, y };
      }
      return ann;
    }));
  };

  const handleMouseUp = () => {
    if (draggingId) {
      pushHistory(annotations);
      setDraggingId(null);
    }
  };

  // Esportazione client-side robusta e fulminea con pdf-lib
  const handleSaveAnnotatedPdf = async () => {
    try {
      setIsExporting(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDocLib = await PDFDocument.load(arrayBuffer);
      const pages = pdfDocLib.getPages();

      annotations.forEach(ann => {
        const targetPage = pages[ann.page - 1];
        if (!targetPage) return;
        const { height } = targetPage.getSize();
        const pdfY = height - (ann.y / scale);
        const pdfX = ann.x / scale;

        if (ann.type === 'text') {
          targetPage.drawText(ann.text || '', {
            x: pdfX,
            y: pdfY,
            size: 12,
            color: rgb(0.14, 0.39, 0.92)
          });
        } else if (ann.type === 'redact') {
          let r = 0.05, g = 0.09, b = 0.16;
          if (ann.color === '#ffffff') { r = 1; g = 1; b = 1; }
          else if (ann.color === '#dc2626') { r = 0.86; g = 0.15; b = 0.15; }
          else if (ann.color === '#2563eb') { r = 0.14; g = 0.39; b = 0.92; }
          else if (ann.color === '#16a34a') { r = 0.08; g = 0.63; b = 0.28; }

          targetPage.drawRectangle({
            x: pdfX,
            y: pdfY - 5,
            width: 100,
            height: 15,
            color: rgb(r, g, b)
          });
        } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
          const hex = (ann.color || '#2563eb').replace('#', '');
          const strokeColor = rgb(
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255
          );
          for (let i = 1; i < ann.points.length; i++) {
            const previous = ann.points[i - 1];
            const current = ann.points[i];
            targetPage.drawLine({
              start: { x: previous.x / scale, y: height - previous.y / scale },
              end: { x: current.x / scale, y: height - current.y / scale },
              thickness: Math.max(0.5, (ann.strokeWidth || 2) / scale),
              color: strokeColor,
            });
          }
        } else if (ann.type === 'stamp') {
          targetPage.drawText('APPROVATO / VISTO', {
            x: pdfX,
            y: pdfY,
            size: 10,
            color: rgb(0.86, 0.15, 0.15)
          });
        } else if (ann.type === 'sign') {
          targetPage.drawText('✓ FIRMATO', {
            x: pdfX,
            y: pdfY,
            size: 10,
            color: rgb(0.14, 0.39, 0.92)
          });
        }
      });

      const pdfBytes = await pdfDocLib.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Modificato_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("PDF modificato esportato con successo!");
    } catch (err: any) {
      console.error("Export Error:", err);
      toast.error("Errore durante il salvataggio del PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white relative select-none">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shadow-md">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold transition">Torna all'Editor</button>
          <span className="text-xs text-slate-300 font-medium truncate max-w-xs">{file.name}</span>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
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
          <button onClick={() => setActiveTool('text')} className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${activeTool === 'text' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}`}>
            <Edit3 className="w-3.5 h-3.5" /><span>+ Testo</span>
          </button>
          <button onClick={() => setActiveTool('draw')} className={\`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition \${activeTool === 'draw' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'}\`} title="Disegna con penna, stilo o dito">
            <PenLine className="w-3.5 h-3.5" /><span>Penna</span>
          </button>
          {activeTool === 'draw' && (
            <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">
              Colore
              <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} className="h-5 w-6 cursor-pointer bg-transparent" aria-label="Colore della penna PDF" />
            </label>
          )}
          
          <div className="flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
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
        
        <div className="flex items-center space-x-3">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 hover:bg-slate-700 rounded-lg transition"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1.5 hover:bg-slate-700 rounded-lg transition"><ZoomIn className="w-4 h-4" /></button>
          
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          
          <button disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)} className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs font-mono">Pagina {pageNum} di {numPages || 1}</span>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum(p => p + 1)} className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"><ChevronRight className="w-4 h-4" /></button>

          <button onClick={handleSaveAnnotatedPdf} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ml-2 shadow-lg transition disabled:opacity-50">
            <Download className="w-4 h-4" /><span>Salva PDF Modificato</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-slate-950">
        {loading ? (
          <div className="text-sm text-slate-400 animate-pulse font-medium">Caricamento anteprima PDF in corso...</div>
        ) : (
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
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

            {annotations.filter(a => a.page === pageNum).map(ann => (
              <div key={ann.id} onMouseDown={(e) => { e.stopPropagation(); setDraggingId(ann.id); }} style={{ left: `${ann.type === 'draw' ? ann.x * scale : ann.x * scale}px`, top: `${ann.type === 'draw' ? ann.y * scale : ann.y * scale}px` }} className="absolute cursor-move px-2.5 py-1 rounded-lg shadow-xl border text-xs font-semibold z-30 flex items-center space-x-2 group hover:ring-2 hover:ring-blue-400 transition-all bg-white text-slate-800 border-slate-300">
                {ann.type === 'text' && <span className="text-blue-700">✏️ {ann.text}</span>}
                {ann.type === 'draw' && <span className="text-blue-700">✍️ Penna</span>}
                {ann.type === 'redact' && <div className="w-24 h-4 rounded" style={{ backgroundColor: ann.color || '#0f172a' }} />}
                {ann.type === 'stamp' && <span className="text-red-600 font-bold border border-red-500 px-1.5 py-0.5 rounded bg-red-50">APPROVATO</span>}
                {ann.type === 'sign' && <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-300">✓ FIRMATO</span>}
                
                <button onClick={(e) => handleDeleteAnnotation(ann.id, e)} title="Elimina" className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600 transition shadow">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
