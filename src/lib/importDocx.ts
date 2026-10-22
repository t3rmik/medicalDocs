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
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.byteLength < 500 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('Il file non sembra un DOCX integro (pacchetto ZIP mancante o incompleto). Se proviene da un download del tablet, esportalo di nuovo e controlla che il download sia terminato.');
    }
    const result = await mammoth.convertToHtml({ arrayBuffer });
    if (!result.value.trim()) {
      throw new Error('Il file Word è leggibile ma non contiene testo importabile. Se contiene solo immagini o formule, prova ad aprirlo con Word oppure esportalo in PDF.');
    }
    return result.value;
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
