import * as pdfjsLib from 'pdfjs-dist';

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
  onProgress?: (status: string, progress: number) => void,
  signal?: AbortSignal
): Promise<{ html: string }> {
  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null
  let pdfDoc: any = null
  let worker: any = null
  const throwIfAborted = () => {
    if (signal?.aborted) {
      const error = new Error('Importazione PDF annullata.')
      error.name = 'AbortError'
      throw error
    }
  }

  try {
    throwIfAborted()
    onProgress?.('Caricamento documento PDF...', 3)
    const arrayBuffer = await file.arrayBuffer()
    throwIfAborted()
    loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), maxImageSize: 16_000_000, isEvalSupported: false })
    pdfDoc = await loadingTask.promise

    let fullHtml = '<h2>' + escapeHtml(file.name.replace(/\.[^/.]+$/, '')) + '</h2>'
    const numPages = pdfDoc.numPages

    const getOcrWorker = async () => {
      if (!worker) {
        const tesseract = await import('tesseract.js')
        worker = await tesseract.createWorker('ita+eng')
      }
      return worker
    }

    for (let i = 1; i <= numPages; i++) {
      throwIfAborted()
      onProgress?.('Elaborazione pagina ' + i + ' di ' + numPages + '...', Math.round(5 + (i / numPages) * 90))
      const page = await pdfDoc.getPage(i)
      let canvas: HTMLCanvasElement | null = null
      try {
        throwIfAborted()
        const textContent = await page.getTextContent()
        let pageText = textContent.items.map((item: any) => item.str).join(' ')

        if (pageText.trim().length < 20) {
          const viewport = page.getViewport({ scale: 1.5 })
          canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.height = Math.ceil(viewport.height)
          canvas.width = Math.ceil(viewport.width)
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise
            throwIfAborted()
            // Passing the canvas directly avoids allocating another base64 copy.
            const ret = await (await getOcrWorker()).recognize(canvas)
            throwIfAborted()
            pageText = ret.data.text
          }
        }

        fullHtml += '<h3>Pagina ' + i + '</h3><p>' + escapeHtml(pageText).replace(/\r?\n/g, '<br>') + '</p>'
      } finally {
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
        try { page.cleanup() } catch { /* PDF.js may still hold shared resources */ }
      }

      // Yield so progress updates and cancellation stay responsive on long PDFs.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }

    onProgress?.('Completato!', 100)
    return { html: fullHtml }
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error
    console.error('PDF Extraction Error:', error)
    throw new Error('Impossibile leggere il PDF. Il file potrebbe essere corrotto o protetto.')
  } finally {
    if (worker) await worker.terminate().catch(() => undefined)
    if (pdfDoc) await pdfDoc.destroy().catch(() => undefined)
    else if (loadingTask) await loadingTask.destroy().catch(() => undefined)
  }
}
