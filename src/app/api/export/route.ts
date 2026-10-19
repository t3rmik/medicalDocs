import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
// @ts-ignore
import HTMLToDOCX from 'html-to-docx';
import TurndownService from 'turndown';

export async function POST(req: NextRequest) {
  try {
    const { content, format, title = 'Documento_Studio' } = await req.json();

    if (format === 'pdf') {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; }
              h1, h2, h3 { color: #0f172a; }
              p { line-height: 1.5; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `;

      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '2.54cm', bottom: '2.54cm', left: '2.54cm', right: '2.54cm' }
      });

      await browser.close();

      const base64 = Buffer.from(pdfBuffer).toString('base64');
      return NextResponse.json({
        success: true,
        filename: `${title}.pdf`,
        dataUrl: `data:application/pdf;base64,${base64}`,
      });
    } 
    
    else if (format === 'word' || format === 'docx') {
      const headerHTML = `<div style="text-align: right; font-size: 10pt; color: gray;">Generato per lo studio universitario - MedicalDocs Pro</div>`;
      
      const fileBuffer = await HTMLToDOCX(content, headerHTML, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
        font: 'Arial',
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      });

      const base64 = Buffer.from(fileBuffer).toString('base64');
      return NextResponse.json({
        success: true,
        filename: `${title}.docx`,
        dataUrl: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`,
      });
    }

    else if (format === 'md' || format === 'txt') {
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(content);
      const base64 = Buffer.from(markdown, 'utf-8').toString('base64');
      const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
      
      return NextResponse.json({
        success: true,
        filename: `${title}.${format}`,
        dataUrl: `data:${mimeType};base64,${base64}`,
      });
    }

    else if (format === 'html') {
      const base64 = Buffer.from(content, 'utf-8').toString('base64');
      return NextResponse.json({
        success: true,
        filename: `${title}.html`,
        dataUrl: `data:text/html;base64,${base64}`,
      });
    }

    return NextResponse.json({ success: false, error: 'Formato non supportato' }, { status: 400 });
  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}