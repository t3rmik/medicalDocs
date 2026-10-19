export type ExportFormat = 'pdf' | 'word' | 'html' | 'md' | 'txt';

export interface ExportRequestPayload {
  content: string;
  format: ExportFormat;
  title?: string;
  author?: string;
}

export interface ExportErrorResponse {
  error: string;
}

export type PdfModeChoice = 'convert' | 'annotate';

export interface PdfAnnotation {
  id: string;
  pageIndex: number;
  type: 'text' | 'redact' | 'stamp' | 'signature';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  imageDataUrl?: string;
}

export interface PageOperation {
  pageIndex: number;
  rotation: number;
  deleted: boolean;
}
