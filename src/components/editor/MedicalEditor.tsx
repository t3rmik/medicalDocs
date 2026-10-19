'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const EditorCore = dynamic(() => import('./EditorCore'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-slate-100">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-3 text-sm text-slate-600 font-medium">Caricamento Editor Word...</span>
    </div>
  )
})

interface MedicalEditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
  isSaving: boolean;
}

export function MedicalEditor({ onChange, initialContent = '', isSaving }: MedicalEditorProps) {
  return <EditorCore onChange={onChange} initialContent={initialContent} isSaving={isSaving} />
}
