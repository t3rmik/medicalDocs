const MiB = 1024 * 1024

export const MAX_PDF_DESKTOP_BYTES = 50 * MiB
export const MAX_PDF_TOUCH_BYTES = 25 * MiB
export const MAX_DOCX_BYTES = 25 * MiB
export const MAX_TEXT_BYTES = 10 * MiB
export const MAX_HTML_BYTES = 5 * MiB
export const MAX_PDF_OCR_BYTES = 25 * MiB

export function isTouchConstrainedDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1440px) and (any-pointer: coarse)').matches
}

export function getMaxImportBytes(fileName: string, touchConstrained = false): number {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return touchConstrained ? MAX_PDF_TOUCH_BYTES : MAX_PDF_DESKTOP_BYTES
  if (ext === 'docx') return MAX_DOCX_BYTES
  if (ext === 'txt') return MAX_TEXT_BYTES
  if (ext === 'html' || ext === 'htm') return MAX_HTML_BYTES
  return 0
}

export function formatBytes(bytes: number): string {
  return bytes >= MiB ? String(Math.round(bytes / MiB)) + ' MB' : String(Math.max(1, Math.round(bytes / 1024))) + ' KB'
}

export function getFileSizeError(fileName: string, maxBytes: number): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const label = extension === 'pdf' ? 'PDF' : extension === 'docx' ? 'Word' : 'documento'
  return label + ' troppo grande: limite ' + formatBytes(maxBytes) + ' per questo dispositivo/formato. Per evitare blocchi, riduci o dividi il file e riprova.'
}
