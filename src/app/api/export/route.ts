import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
// @ts-ignore - la libreria espone un export CommonJS
import HTMLToDOCX from 'html-to-docx';
import TurndownService from 'turndown';

export const runtime = 'nodejs';

const MAX_CONTENT_LENGTH = 3_000_000;

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

    const { content, title, format } = payload as {
      content?: unknown;
      title?: unknown;
      format?: unknown;
    };

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
      const htmlFile = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapedTitle}</title><style>body{font-family:Calibri,Arial,sans-serif;line-height:1.55}.page-break{break-before:page;page-break-before:always;height:0}</style></head><body>${exportContent}</body></html>`;
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
      const fileBuffer = await HTMLToDOCX(exportContent, null, {
        orientation: 'portrait',
        pageSize: { width: 11906, height: 16838 },
        margins: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        font: 'Calibri',
        fontSize: 22,
        lang: 'it-IT',
      });

      return new NextResponse(toExactArrayBuffer(new Uint8Array(fileBuffer)), {
        headers: {
          ...headers,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });
    }

    // Vercel Serverless non dispone necessariamente del browser scaricato da Puppeteer.
    // In produzione usiamo il binario Chromium compilato per ambienti serverless;
    // in sviluppo manteniamo il browser installato da Puppeteer per il sistema locale.
    if (process.env.VERCEL) {
      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        defaultViewport: { width: 1280, height: 720 },
        headless: 'shell',
      });
    } else {
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });
    }
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
            body { font-family: Calibri, Arial, sans-serif; margin: 0; color: #1e293b; line-height: 1.55; overflow-wrap: anywhere; }
            h1, h2, h3 { color: #0f172a; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
            img { max-width: 100%; height: auto; }\n            .page-break { break-before: page; page-break-before: always; height: 0; }
          </style>
        </head>
        <body>
          ${exportContent}
        </body>
      </html>
    `;

    await page.setContent(htmlTemplate, { waitUntil: 'load', timeout: 20_000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
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
