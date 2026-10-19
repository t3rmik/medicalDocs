import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { PdfAnnotation, PageOperation } from '@/types';

export async function exportModifiedPdf(
  originalFile: File,
  annotations: PdfAnnotation[],
  pageOperations: PageOperation[]
): Promise<Uint8Array> {
  const fileArrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileArrayBuffer);
  const pages = pdfDoc.getPages();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  pageOperations.forEach(op => {
    if (op.pageIndex < pages.length) {
      const page = pages[op.pageIndex];
      if (op.rotation !== 0) {
        page.setRotation(degrees(op.rotation));
      }
    }
  });

  for (const ann of annotations) {
    if (ann.pageIndex >= pages.length) continue;
    const page = pages[ann.pageIndex];
    const { height: pageHeight } = page.getSize();

    const pdfY = pageHeight - ann.y;

    if (ann.type === 'text' && ann.text) {
      page.drawText(ann.text, {
        x: ann.x,
        y: pdfY - (ann.fontSize || 14),
        size: ann.fontSize || 14,
        font: helvetica,
        color: rgb(0.1, 0.1, 0.3),
      });
    } else if (ann.type === 'redact') {
      page.drawRectangle({
        x: ann.x,
        y: pdfY - (ann.height || 30),
        width: ann.width || 140,
        height: ann.height || 30,
        color: rgb(1, 1, 1),
      });
    } else if (ann.type === 'stamp' && ann.text) {
      page.drawRectangle({
        x: ann.x,
        y: pdfY - 30,
        width: 160,
        height: 30,
        color: rgb(0.9, 0.95, 1),
        borderColor: rgb(0.1, 0.4, 0.8),
        borderWidth: 2,
      });
      page.drawText(ann.text, {
        x: ann.x + 10,
        y: pdfY - 22,
        size: 11,
        font: helvetica,
        color: rgb(0.1, 0.3, 0.7),
      });
    } else if (ann.type === 'signature' && ann.imageDataUrl) {
      const imgBytes = await fetch(ann.imageDataUrl).then(res => res.arrayBuffer());
      const pngImg = await pdfDoc.embedPng(imgBytes);
      page.drawImage(pngImg, {
        x: ann.x,
        y: pdfY - (ann.height || 50),
        width: ann.width || 120,
        height: ann.height || 50,
      });
    }
  }

  const deletedIndices = pageOperations
    .filter(op => op.deleted)
    .map(op => op.pageIndex)
    .sort((a, b) => b - a);

  deletedIndices.forEach(index => {
    pdfDoc.removePage(index);
  });

  return await pdfDoc.save();
}
