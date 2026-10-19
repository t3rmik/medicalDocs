import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
//@ts-ignore
import HTMLToDOCX from 'html-to-docx';

export async function POST(req: Request) {
  try {
    const { html, title, format } = await req.json();

    if (format === 'docx') {
      const fileBuffer = await HTMLToDOCX(html, null, {
        orientation: 'portrait',
        margins: { top: 720, right: 720, bottom: 720, left: 720 },
      });
      return new NextResponse(fileBuffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(title || 'Documento')}.docx"`,
        },
      });
    }

    // Export PDF tramite Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1, h2, h3 { color: #0f172a; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(htmlTemplate, { waitUntil: 'load' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title || 'Documento')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Export API Error:', error);
    return NextResponse.json({ error: error.message || 'Errore durante l\'esportazione' }, { status: 500 });
  }
}
