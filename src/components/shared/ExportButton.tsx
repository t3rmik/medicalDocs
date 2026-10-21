'use client'

import { MedicalDocsIcon } from '@/components/icons/MedicalDocsIcons'
import { ExportFormat } from '@/types'

interface ExportButtonProps {
  format: ExportFormat;
  onClick: () => void;
  loading?: boolean;
}

export function ExportButton({ format, onClick, loading }: ExportButtonProps) {
  const isWord = format === 'word';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      data-md-export-button="true"
      className={`min-h-11 rounded-xl px-3.5 py-2.5 font-semibold text-sm transition flex items-center gap-2 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
        isWord
          ? 'bg-gradient-to-r from-teal-700 to-teal-600 hover:brightness-105 text-white shadow-teal-900/15'
          : 'bg-slate-950 hover:bg-slate-800 text-white'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <MedicalDocsIcon name="loader" size={16} className="animate-spin" />
      ) : (
        <MedicalDocsIcon name="download" size={16} />
      )}
      <span>{isWord ? 'Esporta Word (.docx)' : 'Esporta PDF'}</span>
    </button>
  );
}
