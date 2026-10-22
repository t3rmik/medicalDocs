function escHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function inlineMarkdown(value: string): string {
  const tokens: string[] = []
  const tokenise = (html: string) => {
    const token = '@@MD_INLINE_' + tokens.length + '@@'
    tokens.push(html)
    return token
  }
  let source = value.replace(/\x60([^\x60\n]+)\x60/g, (_match, code: string) => tokenise('<code>' + escHtml(code) + '</code>'))
  source = source.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g, (_match, label: string, href: string, title?: string) => {
    const safeTitle = title ? ' title="' + escHtml(title) + '"' : ''
    return tokenise('<a href="' + escHtml(href) + '"' + safeTitle + ' target="_blank" rel="noopener noreferrer">' + escHtml(label) + '</a>')
  })
  let text = escHtml(source)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>')
  tokens.forEach((token, index) => { text = text.replace('@@MD_INLINE_' + index + '@@', token) })
  return text
}

function tableCells(line: string): string[] {
  let value = line.trim()
  if (value.startsWith('|')) value = value.slice(1)
  if (value.endsWith('|')) value = value.slice(0, -1)
  return value.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}
function isTableDivider(line: string): boolean {
  const cells = tableCells(line)
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
}
function couldBeTableRow(line: string): boolean {
  const value = line.trim()
  return value.includes('|') && (value.startsWith('|') || value.endsWith('|') || value.split('|').length >= 3)
}
function renderTable(rows: string[]): string {
  const cells = rows.map(tableCells)
  if (cells.length < 2) return ''
  const headers = cells[0]
  const bodyRows = cells.slice(2).filter((row) => row.some(Boolean))
  const head = '<thead><tr>' + headers.map((cell) =>
    '<th scope="col" style="border:1px solid #cbd5e1;background:#f0fdfa;padding:6px 8px;text-align:left;vertical-align:top;font-weight:700;">' + inlineMarkdown(cell) + '</th>').join('') + '</tr></thead>'
  const body = '<tbody>' + bodyRows.map((row) =>
    '<tr>' + headers.map((_header, index) =>
      '<td style="border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;">' + inlineMarkdown(row[index] || '') + '</td>').join('') + '</tr>').join('') + '</tbody>'
  return '<div class="md-ai-table-wrap" role="region" aria-label="Tabella della risposta" tabindex="0"><table class="md-ai-table" style="border-collapse:collapse;width:100%;margin:10px 0;">' + head + body + '</table></div>'
}

/** Repair missing Markdown block boundaries without changing the study content. */
export function normalizeAIOutput(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim().split('\n')
  const output: string[] = []
  let inCode = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd()
    const trimmed = line.trim()
    if (/^\s*\x60{3}/.test(line)) {
      if (!inCode && output.length && output[output.length - 1] !== '') output.push('')
      output.push(line)
      inCode = !inCode
      continue
    }
    if (inCode) { output.push(line); continue }
    const next = lines[index + 1]?.trim() || ''
    const structural = /^#{1,6}\s+/.test(trimmed) || /^([-*+]|\d+[.)])\s+/.test(trimmed) ||
      /^>\s?/.test(trimmed) || /^([-*_])(?:\s*\1){2,}$/.test(trimmed) ||
      (couldBeTableRow(trimmed) && isTableDivider(next)) || /^\*\*[^*]{2,100}\*\*:?$/.test(trimmed)
    if (structural && output.length && output[output.length - 1] !== '') output.push('')
    output.push(line)
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function markdownToHtml(markdown: string, headingOffset = 0): string {
  const lines = normalizeAIOutput(markdown).split('\n')
  const output: string[] = []
  let paragraph: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCode = false
  let codeLines: string[] = []
  const flushParagraph = () => {
    if (paragraph.length) { output.push('<p>' + inlineMarkdown(paragraph.join(' ')) + '</p>'); paragraph = [] }
  }
  const closeList = () => { if (listType) output.push('</' + listType + '>'); listType = null }
  const closeBlocks = () => { flushParagraph(); closeList() }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd()
    if (/^\s*\x60{3}/.test(line)) {
      if (!inCode) { closeBlocks(); inCode = true; codeLines = [] }
      else { output.push('<pre><code>' + codeLines.map(escHtml).join('\n') + '</code></pre>'); inCode = false; codeLines = [] }
      continue
    }
    if (inCode) { codeLines.push(line); continue }
    const next = lines[index + 1]?.trim() || ''
    if (couldBeTableRow(line) && isTableDivider(next)) {
      closeBlocks()
      const rows = [line, lines[index + 1]]
      index += 2
      while (index < lines.length && couldBeTableRow(lines[index])) { rows.push(lines[index]); index += 1 }
      index -= 1
      output.push(renderTable(rows))
      continue
    }
    if (!line.trim()) { closeBlocks(); continue }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/)
    if (heading) {
      closeBlocks()
      const level = Math.min(6, Math.max(2, heading[1].length + 1 + headingOffset))
      output.push('<h' + level + '>' + inlineMarkdown(heading[2].trim()) + '</h' + level + '>')
      continue
    }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) { closeBlocks(); output.push('<hr/>'); continue }
    if (/^\s{0,3}>\s?/.test(line)) {
      closeList(); flushParagraph()
      output.push('<blockquote><p>' + inlineMarkdown(line.replace(/^\s{0,3}>\s?/, '')) + '</p></blockquote>')
      continue
    }
    const bullet = line.match(/^\s*[-*+]\s+(?:\[([ xX])\]\s+)?(.+)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    const kind: 'ul' | 'ol' | null = bullet ? 'ul' : numbered ? 'ol' : null
    if (kind) {
      flushParagraph()
      if (listType !== kind) { closeList(); output.push('<' + kind + '>'); listType = kind }
      const text = bullet ? bullet[2] : numbered![1]
      const prefix = bullet && bullet[1] ? (bullet[1].toLowerCase() === 'x' ? '☑ ' : '☐ ') : ''
      output.push('<li><p>' + prefix + inlineMarkdown(text) + '</p></li>')
      continue
    }
    closeList()
    paragraph.push(line.trim())
  }
  if (inCode) output.push('<pre><code>' + codeLines.map(escHtml).join('\n') + '</code></pre>')
  closeBlocks()
  return output.join('\n')
}

export function markdownToPlainText(markdown: string): string {
  const lines = normalizeAIOutput(markdown).split('\n')
  const output: string[] = []
  let inCode = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd()
    if (/^\s*\x60{3}/.test(line)) { inCode = !inCode; continue }
    if (inCode) { output.push(line); continue }
    const next = lines[index + 1]?.trim() || ''
    if (couldBeTableRow(line) && isTableDivider(next)) {
      const rows = [line]
      index += 2
      while (index < lines.length && couldBeTableRow(lines[index])) { rows.push(lines[index]); index += 1 }
      index -= 1
      rows.forEach((row) => output.push(tableCells(row).join('\t')))
      continue
    }
    const text = line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s{0,3}>\s?/, '')
      .replace(/^\s*[-*+]\s+(?:\[([ xX])\]\s+)?/, (_m, checked: string) => checked ? (checked.toLowerCase() === 'x' ? '☑ ' : '☐ ') : '• ')
      .replace(/^\s*(\d+)[.)]\s+/, '$1. ')
      .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/~~(.+?)~~/g, '$1')
      .replace(/\x60([^\x60]+)\x60/g, '$1')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
      .replace(/^[-*_](?:\s*[-*_]){2,}\s*$/, '')
    output.push(text)
  }
  return output.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Copies rich HTML when supported, with plain-text and iOS-compatible fallbacks. */
export async function copyMarkdownToClipboard(markdown: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') throw new Error('La copia è disponibile solo nel browser.')
  const normalized = normalizeAIOutput(markdown)
  const html = markdownToHtml(normalized)
  const plain = markdownToPlainText(normalized)

  if (window.isSecureContext && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })])
      return
    } catch { /* Continue to a text or legacy copy method. */ }
  }
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(plain); return }
    catch { /* iPad/Safari may reject the async clipboard API. */ }
  }

  const editable = document.createElement('div')
  editable.contentEditable = 'true'
  editable.setAttribute('aria-hidden', 'true')
  editable.style.position = 'fixed'
  editable.style.left = '-10000px'
  editable.style.top = '0'
  editable.style.width = '1px'
  editable.style.height = '1px'
  editable.style.overflow = 'hidden'
  editable.innerHTML = html
  document.body.appendChild(editable)
  const selection = window.getSelection()
  const oldRanges: Range[] = []
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i += 1) oldRanges.push(selection.getRangeAt(i).cloneRange())
    const range = document.createRange()
    range.selectNodeContents(editable)
    selection.removeAllRanges()
    selection.addRange(range)
  }
  let copied = false
  try { editable.focus(); copied = document.execCommand('copy') }
  finally {
    selection?.removeAllRanges()
    oldRanges.forEach((range) => { try { selection?.addRange(range) } catch { /* Ignore detached selections. */ } })
    editable.remove()
  }
  if (!copied) throw new Error('Il browser non ha consentito di copiare. Seleziona il testo e copialo manualmente.')
}
