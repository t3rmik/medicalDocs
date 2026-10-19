'use client'

import { useEffect, useRef } from 'react'
import { RotateCw, Trash2 } from 'lucide-react'
import { PageOperation } from '@/types'

interface PageThumbnailsProps {
  pdfDoc: any;
  totalPages: number;
  currentPage: number;
  onPageSelect: (pageIndex: number) => void;
  pageOperations: PageOperation[];
  onRotatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
}

function ThumbnailCanvas({ pdfDoc, pageIndex, rotation }: { pdfDoc: any; pageIndex: number; rotation: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    let renderTask: any = null;

    const renderThumb = async () => {
      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 0.2, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          // Ignora cancellazioni
        }
      }
    };

    renderThumb();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageIndex, rotation]);

  return <canvas ref={canvasRef} className="rounded shadow bg-white max-h-36 object-contain" />;
}

export function PageThumbnails({
  pdfDoc,
  totalPages,
  currentPage,
  onPageSelect,
  pageOperations,
  onRotatePage,
  onDeletePage,
}: PageThumbnailsProps) {
  return (
    <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col p-3 overflow-y-auto space-y-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pagine PDF ({totalPages})</p>
      
      {Array.from({ length: totalPages }).map((_, index) => {
        const op = pageOperations.find(p => p.pageIndex === index);
        const isDeleted = op?.deleted;
        const rotation = op?.rotation || 0;

        if (isDeleted) return null;

        return (
          <div 
            key={index} 
            className={`relative rounded-lg p-2 border-2 transition cursor-pointer flex flex-col items-center bg-slate-900 ${
              currentPage === index ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'
            }`}
            onClick={() => onPageSelect(index)}
          >
            <ThumbnailCanvas pdfDoc={pdfDoc} pageIndex={index} rotation={rotation} />

            <div className="flex items-center space-x-2 w-full justify-between px-1 text-slate-400 mt-2">
              <span className="text-xs">P. {index + 1}</span>
              <div className="flex space-x-1">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRotatePage(index); }}
                  className="p-1 hover:text-white hover:bg-slate-700 rounded" 
                  title="Ruota 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeletePage(index); }}
                  className="p-1 hover:text-red-400 hover:bg-slate-700 rounded" 
                  title="Elimina pagina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
