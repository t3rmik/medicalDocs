'use client'

import { Loader2 } from 'lucide-react'

interface OcrProgressProps {
  status: string;
  progress: number;
}

export function OcrProgress({ status, progress }: OcrProgressProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Riconoscimento OCR in Corso</h3>
          <p className="text-sm text-slate-500 mt-1">{status}</p>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <span className="text-xs font-semibold text-slate-600">{progress}% completato</span>
      </div>
    </div>
  );
}
