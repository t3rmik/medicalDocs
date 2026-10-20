function escHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function inlineMarkdown(value: string): string {
  let text = escHtml(value);
  text = text.replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return text;
}
export function markdownToHtml(markdown: string, headingOffset = 0): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeLines: string[] = [];
  const flushParagraph = () => { if (paragraph.length) output.push('<p>' + inlineMarkdown(paragraph.join(' ')) + '</p>'); paragraph = []; };
  const closeList = () => { if (listType) output.push('</' + listType + '>'); listType = null; };
  const closeBlocks = () => { flushParagraph(); closeList(); };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^\s*\x60{3}/.test(line)) {
      if (!inCode) { closeBlocks(); inCode = true; codeLines = []; }
      else { output.push('<pre><code>' + codeLines.map(escHtml).join('\n') + '</code></pre>'); inCode = false; codeLines = []; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (!line.trim()) { closeBlocks(); continue; }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (heading) {
      closeBlocks();
      const level = Math.min(6, Math.max(2, heading[1].length + 1 + headingOffset));
      output.push('<h' + level + '>' + inlineMarkdown(heading[2].trim()) + '</h' + level + '>');
      continue;
    }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) { closeBlocks(); output.push('<hr/>'); continue; }
    if (/^\s{0,3}>\s?/.test(line)) { closeList(); flushParagraph(); output.push('<blockquote><p>' + inlineMarkdown(line.replace(/^\s{0,3}>\s?/, '')) + '</p></blockquote>'); continue; }
    const bullet = line.match(/^\s*[-*+]\s+(?:\[([ xX])\]\s+)?(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    const kind: 'ul' | 'ol' | null = bullet ? 'ul' : numbered ? 'ol' : null;
    if (kind) {
      flushParagraph();
      if (listType !== kind) { closeList(); output.push('<' + kind + '>'); listType = kind; }
      const text = bullet ? bullet[2] : numbered![1];
      const prefix = bullet && bullet[1] ? (bullet[1].toLowerCase() === 'x' ? '☑ ' : '☐ ') : '';
      output.push('<li><p>' + prefix + inlineMarkdown(text) + '</p></li>');
      continue;
    }
    closeList(); paragraph.push(line.trim());
  }
  if (inCode) output.push('<pre><code>' + codeLines.map(escHtml).join('\n') + '</code></pre>');
  closeBlocks();
  return output.join('\n');
}
export function markdownToPlainText(markdown: string): string {
  return markdown.replace(/\r\n?/g, '\n').split('\n').map((rawLine) => {
    let line = rawLine;
    if (/^\s*\x60{3}/.test(line)) return '';
    line = line.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/^\s{0,3}>\s?/, '');
    line = line.replace(/^\s*[-*+]\s+(?:\[([ xX])\]\s+)?/, (_m, checked) => checked ? (String(checked).toLowerCase() === 'x' ? '☑ ' : '☐ ') : '• ');
    line = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/\x60([^\x60]+)\x60/g, '$1').replace(/\*([^*]+)\*/g, '$1');
    line = line.replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/, '');
    return line;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
