'use client'

import { useEffect, useRef } from 'react'
import { MedicalDocsIcon } from '@/components/icons/MedicalDocsIcons'
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
    <div data-md-pdf-thumbnails="true" className="w-56 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col p-3 overflow-y-auto space-y-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pagine PDF ({totalPages})</p>
      
      {Array.from({ length: totalPages }).map((_, index) => {
        const op = pageOperations.find(p => p.pageIndex === index);
        const isDeleted = op?.deleted;
        const rotation = op?.rotation || 0;

        if (isDeleted) return null;

        return (
          <div
            key={index}
            data-md-pdf-thumbnail-card="true"
            className={`rounded-xl border p-2 transition ${currentPage === index ? 'border-teal-400 bg-teal-950/50 shadow-[0_0_0_2px_rgba(45,212,191,0.10)]' : 'border-slate-700 bg-slate-800/70 hover:border-slate-500'}`}
          >
            <button
              type="button"
              data-md-pdf-thumbnail-select="true"
              onClick={() => onPageSelect(index)}
              aria-label={`Vai alla pagina ${index + 1}`}
              aria-current={currentPage === index ? 'page' : undefined}
              className="flex min-h-11 w-full flex-col items-center gap-2 rounded-lg px-1 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300"
            >
              <ThumbnailCanvas pdfDoc={pdfDoc} pageIndex={index} rotation={rotation} />
              <span className={`text-xs font-semibold ${currentPage === index ? 'text-teal-100' : 'text-slate-300'}`}>Pagina {index + 1}</span>
            </button>
            <div className="mt-1 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => onRotatePage(index)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-700 hover:text-white"
                title={`Ruota pagina ${index + 1} di 90 gradi`}
                aria-label={`Ruota pagina ${index + 1}`}
              >
                <MedicalDocsIcon name="rotate" size={17} />
              </button>
              <button
                type="button"
                onClick={() => onDeletePage(index)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-950 hover:text-rose-300"
                title={`Elimina pagina ${index + 1}`}
                aria-label={`Elimina pagina ${index + 1}`}
              >
                <MedicalDocsIcon name="trash" size={17} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
