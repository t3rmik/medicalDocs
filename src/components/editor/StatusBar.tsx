'use client'

import { Editor } from '@tiptap/react'
import { ZoomIn, ZoomOut, CheckCircle2 } from 'lucide-react'

export function StatusBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const text = editor.getText();
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const chars = text.length;

  return (
    <div className="h-8 bg-white border-t border-slate-200 flex items-center justify-between px-4 text-xs text-slate-600 shadow-sm z-40">
      <div className="flex items-center space-x-4">
        <span>Pagina 1 di 1</span>
        <span>{words} parole</span>
        <span>{chars} caratteri</span>
        <div className="flex items-center space-x-1 text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Salvato</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span>Italiano</span>
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
          <button className="hover:bg-slate-100 p-1 rounded"><ZoomOut className="w-3 h-3" /></button>
          <span>100%</span>
          <button className="hover:bg-slate-100 p-1 rounded"><ZoomIn className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
}
