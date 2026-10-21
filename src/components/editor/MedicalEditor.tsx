'use client'

import dynamic from 'next/dynamic'
import { MedicalDocsLoader as Loader2 } from '@/components/icons/MedicalDocsIcons'
import { EditorErrorBoundary } from './EditorErrorBoundary'
import type { DocumentPageSection } from '@/types/documentPages'

const EditorCore = dynamic(() => import('./EditorCore'), {
  ssr: false,
  loading: () => (
    <div data-md-editor-loading="true" className="flex h-full min-h-[50dvh] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-teal-50 px-4">
      <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      <span className="ml-3 text-sm font-semibold text-slate-600">Preparazione del foglio di lavoro…</span>
    </div>
  )
})

interface MedicalEditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
  isSaving: boolean;
  documentVersion: number;
  onRegisterInsert?: (handler: ((html: string) => void) | null) => void;
  onRegisterPageSections?: (handler: (() => DocumentPageSection[]) | null) => void;
}

export function MedicalEditor({ onChange, initialContent = '', isSaving, documentVersion, onRegisterInsert, onRegisterPageSections }: MedicalEditorProps) {
  return (
    <EditorErrorBoundary documentKey={documentVersion}>
      <EditorCore
        onChange={onChange}
        initialContent={initialContent}
        isSaving={isSaving}
        documentVersion={documentVersion}
        onRegisterInsert={onRegisterInsert}
        onRegisterPageSections={onRegisterPageSections}
      />
    </EditorErrorBoundary>
  );
}
