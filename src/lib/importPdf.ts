import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configura il worker da CDN ufficiale per evitare errori 404 locali
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (status: string, progress: number) => void
): Promise<{ html: string }> {
  try {
    if (onProgress) onProgress('Caricamento documento PDF...', 10);
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    
    let fullHtml = `<h2>${escapeHtml(file.name.replace(/\.[^/.]+$/, ""))}</h2>`;
    const numPages = pdfDoc.numPages;

    const worker = await createWorker('ita+eng');

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) onProgress(`Elaborazione pagina ${i} di ${numPages}...`, Math.round((i / numPages) * 80));
      
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map((item: any) => item.str).join(' ');

      // Se la pagina ha poco testo, eseguiamo l'OCR sull'immagine della pagina
      if (pageText.trim().length < 20) {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const imgData = canvas.toDataURL('image/png');
          const ret = await worker.recognize(imgData);
          pageText = ret.data.text;
        }
      }

      fullHtml += `<h3>Pagina ${i}</h3><p>${escapeHtml(pageText).replace(/\r?\n/g, '<br>')}</p>`;
    }

    await worker.terminate();
    if (onProgress) onProgress('Completato!', 100);

    return { html: fullHtml };
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    throw new Error("Impossibile leggere il PDF. Il file potrebbe essere corrotto o protetto.");
  }
}