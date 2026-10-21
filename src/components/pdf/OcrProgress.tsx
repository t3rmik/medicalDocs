'use client'

import { MedicalDocsLoader as Loader2 } from '@/components/icons/MedicalDocsIcons'

interface OcrProgressProps {
  status: string;
  progress: number;
}

export function OcrProgress({ status, progress }: OcrProgressProps) {
  return (
    <div data-md-ocr-progress="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl shadow-slate-950/25 flex flex-col items-center">
        <div className="rounded-2xl bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Riconoscimento OCR in Corso</h3>
          <p className="text-sm text-slate-500 mt-1">{status}</p>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-400 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <span className="text-xs font-semibold text-slate-600">{progress}% completato</span>
      </div>
    </div>
  );
}
