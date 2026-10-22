function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


export async function parseFileToHtml(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    // Keep the substantial DOCX parser out of the editor's initial bundle.
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default ?? mammothModule;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value || '<p>Documento Word vuoto.</p>';
  }

  if (extension === 'txt') {
    const text = await file.text();
    return text.split(/\r?\n/).map(line => `<p>${escapeHtml(line.trim()) || '&nbsp;'}</p>`).join('');
  }

  if (extension === 'html' || extension === 'htm') {
    return await file.text();
  }

  throw new Error(`Formato .${extension} non supportato direttamente per la conversione in testo.`);
}
