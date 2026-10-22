import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// @ts-ignore - la libreria espone un export CommonJS
import HTMLToDOCX from 'html-to-docx';
import TurndownService from 'turndown';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_CONTENT_LENGTH = 3_000_000;

type ExportPageLayout = {
  format: 'A4' | 'A5' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  widthMm: number;
  heightMm: number;
  margins: { top: number; right: number; bottom: number; left: number };
};

const PAGE_DIMENSIONS_MM: Record<ExportPageLayout['format'], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
};

function normalizeExportPageLayout(value: unknown): ExportPageLayout {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const format: ExportPageLayout['format'] = ['A4', 'A5', 'A3', 'Letter'].includes(String(raw.format))
    ? raw.format as ExportPageLayout['format']
    : 'A4';
  const orientation: ExportPageLayout['orientation'] = raw.orientation === 'landscape' ? 'landscape' : 'portrait';
  const dimensions = PAGE_DIMENSIONS_MM[format];
  const widthMm = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const heightMm = orientation === 'landscape' ? dimensions.width : dimensions.height;
  const custom = raw.customMargins && typeof raw.customMargins === 'object'
    ? raw.customMargins as Record<string, unknown>
    : {};
  const clamp = (input: unknown, fallback: number) => {
    const parsed = typeof input === 'number' ? input : Number(input);
    return Number.isFinite(parsed) ? Math.round(Math.max(0, Math.min(40, parsed)) * 10) / 10 : fallback;
  };
  const presetValue = raw.margins === 'narrow' ? 3 : raw.margins === 'normal' ? 12 : raw.margins === 'wide' ? 25.4 : null;
  const margins = presetValue === null
    ? {
        top: clamp(custom.top, 4),
        right: clamp(custom.right, 4),
        bottom: clamp(custom.bottom, 4),
        left: clamp(custom.left, 4),
      }
    : { top: presetValue, right: presetValue, bottom: presetValue, left: presetValue };
  return { format, orientation, widthMm, heightMm, margins };
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr|section|article)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function decodeHtmlAttribute(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** Make editor-only nodes portable in Word: equations become readable LaTeX and pen SVGs become rasterizable. */
function prepareWordHtml(html: string): string {
  let safe = html.replace(/<div\b(?=[^>]*data-md-equation=["']true["'])[^>]*>[\s\S]*?<\/div>/gi, (block) => {
    const raw = block.match(/\bdata-latex=["']([^"']*)["']/i)?.[1] || 'Formula matematica';
    return '<p><strong>Formula:</strong> ' + escapeHtmlText(decodeHtmlAttribute(raw).slice(0, 2_000)) + '</p>';
  });
  safe = safe.replace(/<div\b(?=[^>]*data-medicaldocs-ink-layer(?:=["'][^"']*["'])?)[^>]*>[\s\S]*?<\/div>/gi, (block) => {
    const svg = block.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0];
    if (!svg) return '<p>[Annotazione a mano libera non disponibile in questo file]</p>';
    return '<div class="medicaldocs-ink-layer" data-word-ink-layer="true">' + svg + '</div>';
  });
  return safe
    .replace(/\scontenteditable=(["'])[^"']*\1/gi, '')
    .replace(/\sdraggable=(["'])[^"']*\1/gi, '')
    .replace(/\sdata-(?:drag-handle|node-view-wrapper|type)=(["'])[^"']*\1/gi, '');
}

async function rasterizeWordInkLayers(html: string, browser: Awaited<ReturnType<typeof puppeteer.launch>>): Promise<string> {
  const layerPattern = /<div\b(?=[^>]*data-word-ink-layer=["']true["'])[^>]*>[\s\S]*?<\/div>/gi;
  const layers = Array.from(html.matchAll(layerPattern));
  if (!layers.length) return html;
  const page = await browser.newPage();
  const replacements: Array<{ original: string; replacement: string }> = [];
  try {
    for (const match of layers) {
      const original = match[0];
      const svgMatch = original.match(/<svg\b[\s\S]*?<\/svg>/i);
      if (!svgMatch) continue;
      const safeSvg = svgMatch[0]
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(["'])[^"']*\1/gi, '')
        .replace(/\s(?:href|xlink:href)\s*=\s*(["'])[^"']*\1/gi, '');
      await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>' + safeSvg + '</body></html>', { waitUntil: 'load', timeout: 7_000 });
      const png = await page.$eval('svg', async (source) => {
        const svg = source.cloneNode(true) as SVGSVGElement;
        const box = svg.viewBox?.baseVal;
        const sourceWidth = Number(svg.getAttribute('width')) || box?.width || 800;
        const sourceHeight = Number(svg.getAttribute('height')) || box?.height || 1122;
        const width = Math.max(1, Math.min(1600, sourceWidth));
        const height = Math.max(1, Math.min(2400, sourceHeight));
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas non disponibile per le annotazioni Word.');
          context.drawImage(image, 0, 0, width, height);
          return { src: canvas.toDataURL('image/png'), width: sourceWidth, height: sourceHeight };
        } finally {
          URL.revokeObjectURL(url);
        }
      });
      replacements.push({
        original,
        replacement: '<div class="medicaldocs-ink-layer"><img src="' + png.src + '" width="' + png.width + '" height="' + png.height + '" alt="Annotazioni a mano libera" style="max-width:100%;height:auto;" /></div>',
      });
    }
  } finally {
    await page.close().catch(() => undefined);
  }
  let result = html;
  for (const item of replacements) result = result.replace(item.original, item.replacement);
  return result;
}

async function launchExportBrowser(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
  if (process.env.VERCEL) {
    return await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      defaultViewport: { width: 1280, height: 720 },
      headless: 'shell',
    }) as Awaited<ReturnType<typeof puppeteer.launch>>;
  }
  return await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
}

export async function POST(req: Request) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 4_000_000) {
      return NextResponse.json(
        { error: 'Il documento è troppo grande per essere esportato.' },
        { status: 413 }
      );
    }

    const payload: unknown = await req.json();
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
    }

    const { content, title, format, pageLayout: rawPageLayout } = payload as {
      content?: unknown;
      title?: unknown;
      format?: unknown;
      pageLayout?: unknown;
    };
    const pageLayout = normalizeExportPageLayout(rawPageLayout);

    if (typeof content !== 'string' || content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: 'Contenuto mancante o troppo grande.' },
        { status: typeof content === 'string' ? 413 : 400 }
      );
    }

    if (!['pdf', 'word', 'html', 'md', 'txt'].includes(String(format))) {
      return NextResponse.json({ error: 'Formato di esportazione non supportato.' }, { status: 400 });
    }

    const documentTitle =
      typeof title === 'string' && title.trim() ? title.trim().slice(0, 120) : 'Documento';
    const extension = format === 'word' ? 'docx' : String(format);
    const filename = 'document.' + extension;

    const headers = {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    };

    // Translate manual Tiptap page-break blocks to export-compatible markup.
    const exportContent = content.replace(
      /<div\b(?=[^>]*data-page-break=["']true["'])[^>]*>\s*<\/div>/gi,
      '<div class="page-break" style="page-break-after: always;"></div>'
    );

    if (format === 'html') {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      };
      const escapedTitle = documentTitle.replace(/[&<>"]/g, (char) => entities[char]);
      const { widthMm, heightMm, margins } = pageLayout;
      const htmlFile = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapedTitle}</title><style>
        @page{size:${widthMm}mm ${heightMm}mm;margin:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm}
        body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.55;margin:0;color:#1e293b;overflow-wrap:anywhere}
        h1,h2,h3{font-weight:700;line-height:1.3;margin:1.4em 0 .55em;color:#0f172a}
        h1{font-size:2rem}h2{font-size:1.55rem}h3{font-size:1.2rem}p{margin:.7em 0}
        ul,ol{padding-left:1.5rem}li{margin:.25rem 0}blockquote{border-left:3px solid #5eead4;margin:1.25rem 0;padding:.25rem 0 .25rem 1rem;color:#475569}
        table{border-collapse:collapse;width:100%}
        table[data-md-density="compact"]{--md-table-padding-y:3px;--md-table-padding-x:5px}
        table[data-md-density="normal"]{--md-table-padding-y:6px;--md-table-padding-x:8px}
        table[data-md-density="comfortable"]{--md-table-padding-y:12px;--md-table-padding-x:14px}
        th,td{border:1px solid #cbd5e1;padding:var(--md-table-padding-y,6px) var(--md-table-padding-x,8px);vertical-align:top}
        @media print{table[data-md-width]{width:100%!important;min-width:0!important;max-width:100%!important}}
        img{max-width:100%;height:auto}.page-break{break-before:page;page-break-before:always;height:0}
      </style></head><body>${exportContent}</body></html>`;
      return new NextResponse(htmlFile, {
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (format === 'md') {
      const markdown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' }).turndown(exportContent);
      return new NextResponse(markdown, {
        headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    if (format === 'txt') {
      return new NextResponse(htmlToPlainText(exportContent), {
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (format === 'word') {
      const { widthMm, heightMm, margins } = pageLayout;
      const mmToTwips = (value: number) => Math.round(value * 56.6929);
      let wordContent = prepareWordHtml(exportContent);
      if (/data-word-ink-layer=["']true["']/i.test(wordContent)) {
        browser = await launchExportBrowser();
        wordContent = await rasterizeWordInkLayers(wordContent, browser);
      }
      const fileBuffer = await HTMLToDOCX(wordContent, null, {
        orientation: pageLayout.orientation,
        pageSize: { width: mmToTwips(widthMm), height: mmToTwips(heightMm) },
        margins: {
          top: mmToTwips(margins.top),
          right: mmToTwips(margins.right),
          bottom: mmToTwips(margins.bottom),
          left: mmToTwips(margins.left),
        },
        font: 'Calibri',
        fontSize: 22,
        lang: 'it-IT',
      });
      const wordBytes = new Uint8Array(fileBuffer as ArrayBuffer);
      if (wordBytes.byteLength < 500 || wordBytes[0] !== 0x50 || wordBytes[1] !== 0x4b) {
        throw new Error('La conversione Word non ha prodotto un pacchetto DOCX valido. Il file non è stato scaricato.');
      }
      try {
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default ?? mammothModule;
        await mammoth.convertToHtml({ buffer: Buffer.from(wordBytes) });
      } catch (validationError) {
        console.error('[MedicalDocs] Generated DOCX failed validation', validationError);
        return NextResponse.json(
          { error: 'Il file Word generato non ha superato il controllo di integrità. Riprova senza annotazioni/formule particolari oppure esporta prima in PDF.' },
          { status: 502 }
        );
      }
      return new NextResponse(toExactArrayBuffer(wordBytes), {
        headers: {
          ...headers,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'X-MedicalDocs-Export-Format': 'docx',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Vercel Serverless non dispone necessariamente del browser scaricato da Puppeteer.
    // In produzione usiamo il binario Chromium compilato per ambienti serverless;
    // in sviluppo manteniamo il browser installato da Puppeteer per il sistema locale.
    browser = await launchExportBrowser();
    const page = await browser.newPage();
    // Il contenuto è fornito dall'utente: non eseguire script né inviare dati a host esterni.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:') || url === 'about:blank') {
        void request.continue();
      } else {
        void request.abort();
      }
    });

    const safeTitle = documentTitle.replace(/[&<>"]/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      };
      return entities[char];
    });

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="it">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${safeTitle}</title>
          <style>
            @page { size: ${pageLayout.widthMm}mm ${pageLayout.heightMm}mm; margin: 0; }
            body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 0; color: #1e293b; line-height: 1.55; overflow-wrap: anywhere; }
            h1, h2, h3 { color: #0f172a; font-weight: 700; line-height: 1.3; margin: 1.4em 0 .55em; }
            h1 { font-size: 2rem; } h2 { font-size: 1.55rem; } h3 { font-size: 1.2rem; }
            p { margin: .7em 0; }
            ul, ol { padding-left: 1.5rem; } li { margin: .25rem 0; }
            blockquote { border-left: 3px solid #5eead4; margin: 1.25rem 0; padding: .25rem 0 .25rem 1rem; color: #475569; }
            table { border-collapse: collapse; width: 100%; }
            table[data-md-density="compact"] { --md-table-padding-y: 3px; --md-table-padding-x: 5px; }
            table[data-md-density="normal"] { --md-table-padding-y: 6px; --md-table-padding-x: 8px; }
            table[data-md-density="comfortable"] { --md-table-padding-y: 12px; --md-table-padding-x: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: var(--md-table-padding-y, 6px) var(--md-table-padding-x, 8px); vertical-align: top; }
            @media print { table[data-md-width] { width: 100% !important; min-width: 0 !important; max-width: 100% !important; } }
            img { max-width: 100%; height: auto; }
            .page-break { break-before: page; page-break-before: always; height: 0; }
          </style>
        </head>
        <body>
          ${exportContent}
        </body>
      </html>
    `;

    await page.setContent(htmlTemplate, { waitUntil: 'load', timeout: 20_000 });
    const pdfBuffer = await page.pdf({
      width: `${pageLayout.widthMm}mm`,
      height: `${pageLayout.heightMm}mm`,
      preferCSSPageSize: true,
      printBackground: true,
      margin: {
        top: `${pageLayout.margins.top}mm`,
        right: `${pageLayout.margins.right}mm`,
        bottom: `${pageLayout.margins.bottom}mm`,
        left: `${pageLayout.margins.left}mm`,
      },
    });

    return new NextResponse(toExactArrayBuffer(pdfBuffer), {
      headers: { ...headers, 'Content-Type': 'application/pdf' },
    });
  } catch (error) {
    console.error('Export API Error:', error);
    return NextResponse.json(
      { error: "Errore durante l'esportazione del documento." },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Errore durante la chiusura del browser di esportazione.');
      }
    }
  }
}
