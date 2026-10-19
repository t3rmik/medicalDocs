import mammoth from 'mammoth';

export async function parseFileToHtml(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value || '<p>Documento Word vuoto.</p>';
  }

  if (extension === 'txt' || extension === 'rtf') {
    const text = await file.text();
    return text.split('\n').map(line => `<p>${line.trim() || '&nbsp;'}</p>`).join('');
  }

  if (extension === 'html' || extension === 'htm') {
    return await file.text();
  }

  throw new Error(`Formato .${extension} non supportato direttamente per la conversione in testo.`);
}
