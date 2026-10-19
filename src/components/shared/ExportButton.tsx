'use client'

import { Download, Loader2 } from 'lucide-react'
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
      className={`px-3 py-1.5 rounded-md font-semibold text-xs transition flex items-center space-x-1.5 ${
        isWord
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-red-600 hover:bg-red-700 text-white'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>{isWord ? 'Esporta Word (.docx)' : 'Esporta PDF'}</span>
    </button>
  );
}
