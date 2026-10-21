'use client'

import { useEffect, useState } from 'react'
import { markdownToHtml, markdownToPlainText } from '@/lib/markdown'
import {
  MedicalDocsClose as X,
  MedicalDocsSpark as Sparkles,
  MedicalDocsDocument as FileText,
  MedicalDocsOutline as ListTree,
  MedicalDocsLayers as Layers,
  MedicalDocsHelp as HelpCircle,
  MedicalDocsBookOpen as BookOpen,
  MedicalDocsSpark as Wand2,
  MedicalDocsMessage as MessageSquare,
  MedicalDocsLoader as Loader2,
  MedicalDocsCopy as Copy,
  MedicalDocsCheckCircle as Check,
  MedicalDocsArrowUpRight as ArrowUpRight,
  MedicalDocsShieldAlert as ShieldAlert,
} from '@/components/icons/MedicalDocsIcons'

import type { DocumentPageSection } from '@/types/documentPages'

type AIAction = 'summarize' | 'outline' | 'flashcards' | 'quiz' | 'explain' | 'rewrite' | 'ask'

interface AIStudioProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  content: string;
  onInsert: (result: string, actionLabel: string) => void;
  getPageSections?: () => DocumentPageSection[];
}

const ACTIONS: Array<{ id: AIAction; label: string; description: string; icon: typeof Sparkles }> = [
  { id: 'summarize', label: 'Riassumi', description: 'I concetti principali in modo chiaro', icon: FileText },
  { id: 'outline', label: 'Crea schema', description: 'Argomenti e sottoargomenti gerarchici', icon: ListTree },
  { id: 'flashcards', label: 'Flashcard', description: 'Domande e risposte per ripassare', icon: Layers },
  { id: 'quiz', label: 'Genera quiz', description: 'Domande a scelta multipla con soluzioni', icon: HelpCircle },
  { id: 'explain', label: 'Spiega meglio', description: 'Chiarisci i concetti del documento', icon: BookOpen },
  { id: 'rewrite', label: 'Migliora scrittura', description: 'Rendi il testo più leggibile senza alterarlo', icon: Wand2 },
  { id: 'ask', label: 'Domanda libera', description: 'Fai una domanda sul documento', icon: MessageSquare },
]

function detectPdfPageSections(text: string): DocumentPageSection[] {
  const matches = Array.from(text.matchAll(/(?:^|\n)\s*Pagina\s+(\d+)\s*(?=\n)/gi));
  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const wholeMatch = match[0] || '';
    const matchIndex = match.index ?? 0;
    const markerOffset = wholeMatch.toLowerCase().lastIndexOf('pagina');
    const start = matchIndex + markerOffset;
    const next = matches[index + 1];
    const nextStart = next
      ? (next.index ?? text.length) + (next[0] || '').toLowerCase().lastIndexOf('pagina')
      : text.length;
    return {
      number: Number(match[1]),
      text: text.slice(start, nextStart).trim(),
    };
  }).filter((page) => Number.isInteger(page.number) && page.number > 0 && page.text.length > 0);
}

function detectExplicitPageSections(markup: string): DocumentPageSection[] {
  if (typeof window === 'undefined') return []
  const parsed = new DOMParser().parseFromString(markup, 'text/html')
  const blocks = Array.from(parsed.body.children)
  if (!blocks.some((block) => block.matches('[data-page-break="true"]'))) return []

  const pages: DocumentPageSection[] = []
  let buffer: string[] = []
  const flush = () => {
    const text = buffer.filter(Boolean).join('\n\n').trim()
    if (text.length > 0) {
      pages.push({ number: pages.length + 1, title: 'Pagina ' + (pages.length + 1), text: 'Pagina ' + (pages.length + 1) + '\n' + text })
    }
    buffer = []
  }

  for (const block of blocks) {
    if (block.matches('[data-page-break="true"]')) flush()
    else {
      const text = extractPlainText(block.outerHTML)
      if (text) buffer.push(text)
    }
  }
  flush()
  return pages.length > 1 ? pages : []
}

function detectTopicSections(markup: string): DocumentPageSection[] {
  if (typeof window === 'undefined') return []
  const parsed = new DOMParser().parseFromString(markup, 'text/html')
  const blocks = Array.from(parsed.body.children)
  const headingPattern = /^H[1-4]$/
  const sections: DocumentPageSection[] = []
  let currentTitle = ''
  let currentParts: string[] = []
  let preamble: string[] = []

  const flush = () => {
    const text = currentParts.filter(Boolean).join('\n\n').trim()
    if (currentTitle && text.length > 12) {
      sections.push({ number: sections.length + 1, title: currentTitle, text })
    }
    currentTitle = ''
    currentParts = []
  }

  for (const block of blocks) {
    if (headingPattern.test(block.tagName)) {
      flush()
      currentTitle = (block.textContent || '').trim()
      if (currentTitle) currentParts.push(currentTitle)
    } else {
      const text = extractPlainText(block.outerHTML)
      if (!text) continue
      if (currentTitle) currentParts.push(text)
      else preamble.push(text)
    }
  }
  flush()

  const intro = preamble.join('\n\n').trim()
  if (intro.length > 80 && sections.length > 1) {
    sections.unshift({ number: 0, title: 'Introduzione', text: 'Introduzione\n' + intro })
    sections.forEach((section, index) => { section.number = index + 1 })
  }
  return sections.length > 1 ? sections : []
}

function normalizeAIOutput(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    // Preserve paragraph separation when the model puts a single newline after a sentence.
    .replace(/([.!?;:])\n(?=[A-ZÀ-ÖØ-Þ0-9“"'(])/g, '$1\n\n')
    .replace(/([^\n])\n(?=#{1,6}\s)/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractPlainText(markup: string): string {
  if (typeof window === 'undefined') {
    return markup.replace(/<[^>]*>/g, ' ').replace(/\u00a0/g, ' ').trim()
  }

  const parsed = new DOMParser().parseFromString(markup, 'text/html')
  parsed.querySelectorAll('script, style, img, svg').forEach((node) => node.remove())

  // textContent alone concatenates adjacent HTML blocks (for example </p><p>),
  // so put explicit line breaks around editor blocks before reading their text.
  parsed.querySelectorAll('br').forEach((node) => node.replaceWith(parsed.createTextNode('\n')))
  parsed.querySelectorAll(
    'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre, section, article, tr, td, th'
  ).forEach((node) => {
    node.prepend(parsed.createTextNode('\n'))
    node.append(parsed.createTextNode('\n'))
  })

  return (parsed.body.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function AIStudio({ isOpen, onClose, documentTitle, content, onInsert, getPageSections }: AIStudioProps) {
  const [selectedAction, setSelectedAction] = useState<AIAction>('summarize')
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState('')
  const [resultExpanded, setResultExpanded] = useState(false)
  const [generationInfo, setGenerationInfo] = useState<{
    provider: string;
    model: string;
    fallbackUsed: boolean;
  } | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [retryMessage, setRetryMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [sourceMode, setSourceMode] = useState<'document' | 'pages' | 'topics'>('document')
  const [selectedTopics, setSelectedTopics] = useState<number[]>([])
  const [topicFocus, setTopicFocus] = useState('')
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([])
  const [livePageSections, setLivePageSections] = useState<DocumentPageSection[]>([])

  useEffect(() => {
    if (!isOpen || !getPageSections) {
      setLivePageSections([])
      return
    }
    let scheduled = false
    const refreshPages = () => {
      const next = getPageSections()
      setLivePageSections((current) => {
        const unchanged = current.length === next.length && current.every((page, index) =>
          page.number === next[index]?.number &&
          page.title === next[index]?.title &&
          page.text === next[index]?.text
        )
        return unchanged ? current : next
      })
    }
    refreshPages()
    const root = document.querySelector<HTMLElement>('.ProseMirror.editor-page')
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        refreshPages()
      })
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [content, getPageSections, isOpen])

  if (!isOpen) return null

  const plainText = extractPlainText(content)
  const markedPages = detectPdfPageSections(plainText)
  const explicitPages = detectExplicitPageSections(content)
  const hasExactPageBoundaries = markedPages.length > 0 || explicitPages.length > 1 || livePageSections.length > 1
  // Original imported PDF page markers take priority. Otherwise use the editor's
  // current physical pagination, including how manual breaks affect the layout.
  // Explicit-break grouping is only a fallback before live page measurements exist.
  const pageSections = markedPages.length > 0
    ? markedPages
    : livePageSections.length > 0
      ? livePageSections
      : explicitPages
  const topicSections = detectTopicSections(content)
  const currentAction = ACTIONS.find((action) => action.id === selectedAction) || ACTIONS[0]

  const runAction = async (action: AIAction = selectedAction) => {
    setSelectedAction(action); setIsLoading(true); setError(''); setResult(''); setResultExpanded(false); setGenerationInfo(null); setRetryMessage(''); setCopied(false);
    const selectedPages = sourceMode === 'pages'
      ? pageSections.filter((page) => selectedPageNumbers.includes(page.number))
      : []
    const selectedTopicSections = sourceMode === 'topics'
      ? topicSections.filter((topic) => selectedTopics.includes(topic.number))
      : []
    const manualTopicSelection = sourceMode === 'topics' && topicSections.length <= 1 ? topicFocus.trim() : ''
    const sourceText = sourceMode === 'pages'
      ? selectedPages.map((page) => page.text).join('\n\n')
      : sourceMode === 'topics'
        ? topicSections.length > 1
          ? selectedTopicSections.map((topic) => topic.text).join('\n\n')
          : plainText
        : plainText

    if (sourceMode === 'pages' && selectedPages.length === 0) {
      setError('Seleziona almeno una pagina da includere nel lavoro dell’AI.')
      setIsLoading(false)
      return
    }
    if (sourceMode === 'topics' && topicSections.length > 1 && selectedTopicSections.length === 0) {
      setError('Seleziona almeno un argomento da includere nel lavoro dell’AI.')
      setIsLoading(false)
      return
    }
    if (sourceMode === 'topics' && topicSections.length <= 1 && !manualTopicSelection) {
      setError('Scrivi almeno un argomento da cercare nel documento.')
      setIsLoading(false)
      return
    }
    if (sourceText.length < 2) { setError('Il testo selezionato non contiene contenuto sufficiente. Seleziona altre pagine o argomenti e riprova.'); setIsLoading(false); return; }
    try {
      const selectedPagesAreContiguous = selectedPages.every((page, index) =>
        index === 0 || page.number === selectedPages[index - 1].number + 1
      )
      const pageRange = sourceMode === 'pages' && hasExactPageBoundaries && selectedPages.length && selectedPagesAreContiguous
        ? { from: selectedPages[0].number, to: selectedPages[selectedPages.length - 1].number }
        : undefined
      const effectiveInstruction = [
        instruction.trim(),
        manualTopicSelection
          ? 'Concentrati esclusivamente su questi argomenti e usa solo le parti pertinenti del documento: ' + manualTopicSelection + '.'
          : '',
      ].filter(Boolean).join('\n\n')
      const body = JSON.stringify({ action, content: sourceText, instruction: effectiveInstruction, pageRange });
      const send = () => fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      let response = await send();
      type AIResponse = {
        result?: string;
        error?: string;
        retryable?: boolean;
        retryAfterSeconds?: number;
        provider?: string;
        model?: string;
        fallbackUsed?: boolean;
      };
      let payload = await response.json().catch(() => ({})) as AIResponse;
      if (response.status === 429 && payload.retryable === true && typeof payload.retryAfterSeconds === 'number' && payload.retryAfterSeconds >= 1 && payload.retryAfterSeconds <= 5) {
        const seconds = Math.ceil(payload.retryAfterSeconds);
        setRetryMessage('Limite temporaneo: riprovo una sola volta tra ' + seconds + ' secondi…');
        await new Promise<void>((resolve) => window.setTimeout(resolve, seconds * 1000));
        setRetryMessage('');
        response = await send();
        payload = await response.json().catch(() => ({})) as AIResponse;
      }
      if (!response.ok) throw new Error(payload.error || 'La richiesta AI non è riuscita.');
      if (typeof payload.result !== 'string' || !payload.result.trim()) throw new Error('Il servizio AI non ha restituito testo.');
      setResult(normalizeAIOutput(payload.result.trim()));
      setResultExpanded(true);
      if (typeof payload.provider === 'string' && typeof payload.model === 'string') {
        setGenerationInfo({
          provider: payload.provider,
          model: payload.model,
          fallbackUsed: payload.fallbackUsed === true,
        });
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Errore inatteso durante la richiesta AI.'); }
    finally { setIsLoading(false); setRetryMessage(''); }
  }

  const copyResult = async () => {
    const plain = markdownToPlainText(result);
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([markdownToHtml(result)], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          })]);
        } catch { await navigator.clipboard.writeText(plain); }
      } else { await navigator.clipboard.writeText(plain); }
      setCopied(true); window.setTimeout(() => setCopied(false), 1600);
    } catch { setError('Il browser non ha consentito di copiare. Seleziona il testo del risultato e copialo manualmente.'); }
  }

  const actionIsSelected = (action: AIAction) => selectedAction === action

  return (
    <div
      data-md-ai-studio="true"
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-3 py-5 backdrop-blur-sm sm:px-6 sm:py-10"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section data-md-ai-dialog="true" className="my-auto flex max-h-[calc(100dvh-1.25rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-[#f8fbfc] shadow-2xl shadow-slate-950/30 ring-1 ring-slate-950/5 sm:max-h-[calc(100vh-5rem)]" role="dialog" aria-modal="true" aria-labelledby="ai-studio-title">
        <header className="flex items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-900/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="ai-studio-title" className="text-base font-bold tracking-tight text-slate-950">AI Studio</h2>
              <span className="rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-teal-700">ASSISTENTE DI STUDIO</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">Documento attivo: {documentTitle || 'Senza titolo'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Chiudi AI Studio">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-white p-3 sm:p-4 lg:border-b-0 lg:border-r">
            <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Scegli uno strumento</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => { setSelectedAction(action.id); setError(''); setResult(''); setResultExpanded(false); setGenerationInfo(null); setCopied(false) }}
                    aria-pressed={actionIsSelected(action.id)}
                    className={'flex min-w-0 items-start gap-2.5 rounded-xl border p-3 text-left transition ' + (actionIsSelected(action.id) ? 'border-teal-200 bg-teal-50 shadow-sm ring-1 ring-teal-100' : 'border-slate-200 bg-white hover:border-teal-100 hover:bg-slate-50')}
                  >
                    <span className={'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + (actionIsSelected(action.id) ? 'bg-white text-teal-700' : 'bg-slate-100 text-slate-500')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-800 sm:text-sm">{action.label}</span>
                      <span className="mt-1 hidden text-[11px] leading-4 text-slate-500 lg:block">{action.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="flex min-h-[360px] min-w-0 flex-col p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-700">AI sul documento</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{currentAction.label}</h3>
                <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">{currentAction.description}. Il risultato è una bozza da controllare.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">
                <FileText className="h-3 w-3" />
                Testo del documento
              </span>
            </div>

            {(pageSections.length > 1 || topicSections.length > 1 || plainText.length > 150) && (
              <section className="mb-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-3.5 sm:p-4" aria-label="Selezione della fonte per AI">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-teal-800">Su quale parte deve lavorare l’AI?</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Scegli il documento intero, singole pagine oppure uno o più argomenti.</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Parte del documento da analizzare">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    <input type="radio" name="ai-source-mode" checked={sourceMode === 'document'} onChange={() => setSourceMode('document')} className="accent-teal-700" />
                    Documento intero
                  </label>
                  {pageSections.length > 1 && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      <input type="radio" name="ai-source-mode" checked={sourceMode === 'pages'} onChange={() => { setSourceMode('pages'); setSelectedPageNumbers(pageSections.map((page) => page.number)) }} className="accent-teal-700" />
                      Scegli pagine
                    </label>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    <input type="radio" name="ai-source-mode" checked={sourceMode === 'topics'} onChange={() => { setSourceMode('topics'); if (selectedTopics.length === 0) setSelectedTopics(topicSections.map((topic) => topic.number)) }} className="accent-teal-700" />
                    Scegli argomenti
                  </label>
                </div>

                {pageSections.length <= 1 && plainText.length > 150 && (
                  <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-5 text-slate-600">
                    Non sono rilevabili più pagine reali per questo documento. Non dividerò il testo in sezioni stimate: usa interruzioni di pagina oppure controlla che l’impaginazione sia pronta.
                  </p>
                )}

                {sourceMode === 'pages' && pageSections.length > 1 && (
                  <div className="mt-3 rounded-xl border border-teal-100 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Quali pagine vuoi includere?</p>
                        <p className="mt-1 text-[11px] text-slate-500">{selectedPageNumbers.filter((number) => pageSections.some((page) => page.number === number)).length} di {pageSections.length} selezionate</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setSelectedPageNumbers(pageSections.map((page) => page.number))}
                          className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-[11px] font-bold text-teal-800 hover:bg-teal-100">Tutte</button>
                        <button type="button" onClick={() => setSelectedPageNumbers([])}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Nessuna</button>
                      </div>
                    </div>
                    <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-56 sm:grid-cols-2">
                      {pageSections.map((page) => {
                        const checked = selectedPageNumbers.includes(page.number)
                        const preview = page.text.replace(/^Pagina\s+\d+\s*/i, '').replace(/\s+/g, ' ').trim()
                        return (
                          <label key={page.number} className={'flex min-w-0 cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ' + (checked ? 'border-teal-300 bg-teal-50/80' : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50')}>
                            <input type="checkbox" checked={checked}
                              onChange={(event) => setSelectedPageNumbers((current) => event.target.checked
                                ? Array.from(new Set([...current, page.number])).sort((a, b) => a - b)
                                : current.filter((number) => number !== page.number))}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-teal-700" />
                            <span className="min-w-0">
                              <span className="block text-xs font-bold text-slate-800">{page.title || 'Pagina ' + page.number}</span>
                              <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-slate-500">{preview.slice(0, 140) || 'Nessuna anteprima testuale'}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-slate-500">{hasExactPageBoundaries ? 'Pagine originali o confini di pagina rilevati nell’impaginazione corrente.' : 'Le pagine non sono ancora distinguibili con certezza.'}</p>
                  </div>
                )}

                {sourceMode === 'topics' && topicSections.length > 1 && (
                  <div className="mt-3 rounded-xl border border-teal-100 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-700">Spunta gli argomenti da includere</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {topicSections.map((topic) => (
                        <label key={topic.number} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-teal-200">
                          <input type="checkbox" checked={selectedTopics.includes(topic.number)}
                            onChange={(event) => setSelectedTopics((current) => event.target.checked
                              ? Array.from(new Set([...current, topic.number]))
                              : current.filter((number) => number !== topic.number))}
                            className="mt-0.5 accent-teal-700" />
                          <span>{topic.title || ('Argomento ' + topic.number)}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-slate-500">La richiesta userà solo il testo associato ai titoli selezionati.</p>
                  </div>
                )}
                {sourceMode === 'topics' && topicSections.length <= 1 && (
                  <div className="mt-3 rounded-xl border border-teal-100 bg-white p-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-700">Quali argomenti vuoi approfondire?</span>
                      <textarea value={topicFocus} onChange={(event) => setTopicFocus(event.target.value)}
                        placeholder="Ad esempio: ciclo cardiaco, valvole e gittata cardiaca"
                        rows={3}
                        className="w-full resize-y rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                    </label>
                    <p className="mt-2 text-[11px] leading-4 text-slate-500">L’AI userà il documento come fonte, ma limiterà riassunto, schema, flashcard o quiz agli argomenti indicati.</p>
                  </div>
                )}
              </section>
            )}

            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                {selectedAction === 'ask' ? 'La tua domanda' : 'Indicazioni aggiuntive (facoltative)'}
              </span>
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={selectedAction === 'ask' ? 3 : 2}
                maxLength={2000}
                placeholder={selectedAction === 'ask' ? 'Es. Quali sono i concetti da ricordare per l’esame?' : 'Es. Concentrati sui concetti chiave e mantieni i termini tecnici.'}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <button
              type="button"
              onClick={() => runAction()}
              disabled={isLoading || (selectedAction === 'ask' && instruction.trim().length < 3)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/10 transition hover:from-teal-800 hover:to-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isLoading ? 'Sto elaborando…' : 'Genera risultato'}
              {!isLoading && <ArrowUpRight className="h-4 w-4" />}
            </button>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800" role="alert">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-5 flex min-h-[44vh] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-h-[48vh] lg:min-h-[320px]">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-3">
                <span className="text-xs font-semibold text-slate-700">Risultato</span>
                {result && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => setResultExpanded(true)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50" aria-label="Apri il risultato a schermo intero">
                      Leggi grande
                    </button>
                    <button type="button" onClick={copyResult} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100" aria-label="Copia il risultato">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copiato' : 'Copia'}
                    </button>
                    <button type="button" onClick={() => onInsert(result, currentAction.label)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Inserisci nel documento
                    </button>
                  </div>
                )}
              </div>
              {result && generationInfo && (
                <div
                  className={'flex items-start gap-2 border-b px-4 py-3 text-xs ' + (generationInfo.provider === 'gemini'
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700')}
                  role="status"
                  aria-live="polite"
                >
                  {generationInfo.provider === 'gemini'
                    ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />}
                  <div className="min-w-0">
                    <p className="font-bold">
                      {generationInfo.provider === 'gemini'
                        ? 'ATTENZIONE: risposta generata da Google Gemini'
                        : 'Modello AI utilizzato'}
                    </p>
                    <p className="mt-0.5 break-words">
                      {generationInfo.provider === 'groq' ? 'Provider: Groq' : generationInfo.provider === 'gemini' ? 'Provider: Google Gemini' : 'Provider: configurazione personalizzata'}
                      {' · Modello: '}
                      {generationInfo.model === 'openai/gpt-oss-120b' ? 'GPT-OSS 120B' :
                        generationInfo.model === 'openai/gpt-oss-20b' ? 'GPT-OSS 20B' : generationInfo.model}
                      {generationInfo.fallbackUsed ? ' · modello di riserva' : ''}
                    </p>
                  </div>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex min-h-[120px] flex-col items-center justify-center gap-3 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Loader2 className="h-5 w-5 animate-spin" /></span>
                    <p className="text-sm font-medium text-slate-700">Sto elaborando il documento…</p>
                    <p className="text-xs text-slate-500">{retryMessage || 'I documenti lunghi possono richiedere fino a un minuto. Lascia aperta questa finestra.'}</p>
                  </div>
                ) : result ? (
                  <div className="prose prose-sm max-w-none break-words text-sm leading-6 text-slate-700" dangerouslySetInnerHTML={{ __html: markdownToHtml(result) }} />
                ) : (
                  <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300"><Sparkles className="h-5 w-5" /></div>
                    <p className="text-sm font-medium text-slate-600">Il tuo risultato apparirà qui</p>
                    <p className="max-w-xs text-xs leading-5 text-slate-400">Scegli uno strumento e avvia la generazione sul documento attivo.</p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-500">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              Il testo del documento viene inviato al provider AI configurato dal server. Evita dati identificativi non necessari e verifica sempre il risultato: è un supporto allo studio, non una diagnosi né una raccomandazione clinica.
            </p>
          </div>
        </div>
      </section>
      {resultExpanded && result && (
        <div className="fixed inset-0 z-[180] flex items-stretch justify-center bg-slate-950/65 p-1.5 backdrop-blur-sm sm:p-3" role="dialog" aria-modal="true" aria-label="Risultato AI a schermo intero">
          <section className="flex h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-3xl">
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-white via-teal-50/70 to-sky-50 px-3 py-3 sm:px-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">Risultato AI · {currentAction.label}</h2>
                <p className="truncate text-[11px] text-slate-500">{documentTitle || 'Documento senza titolo'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={copyResult} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiato' : 'Copia'}
                </button>
                <button type="button" onClick={() => { onInsert(result, currentAction.label); setResultExpanded(false) }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Inserisci
                </button>
                <button type="button" onClick={() => setResultExpanded(false)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50" aria-label="Torna alle opzioni AI">
                  <X className="h-3.5 w-3.5" />
                  Opzioni
                </button>
              </div>
            </header>
            {generationInfo && (
              <div className={'flex shrink-0 items-start gap-2 border-b px-4 py-2.5 text-xs ' + (generationInfo.provider === 'gemini'
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-slate-200 bg-slate-50 text-slate-700')} role="status">
                {generationInfo.provider === 'gemini' ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> : <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />}
                <div className="min-w-0">
                  <span className="font-bold">{generationInfo.provider === 'gemini' ? 'Risposta generata da Google Gemini' : 'Modello AI utilizzato'} · </span>
                  <span className="break-words">{generationInfo.provider === 'groq' ? 'Groq' : generationInfo.provider === 'gemini' ? 'Google Gemini' : generationInfo.provider} · {generationInfo.model}{generationInfo.fallbackUsed ? ' · modello di riserva' : ''}</span>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-7">
              <article className="prose prose-slate prose-base mx-auto w-full max-w-4xl break-words text-[15px] leading-7 sm:text-[17px] sm:leading-8" dangerouslySetInnerHTML={{ __html: markdownToHtml(result) }} />
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-500 sm:px-6">
              <span>Controlla sempre il contenuto prima di inserirlo negli appunti.</span>
              <button type="button" onClick={() => setResultExpanded(false)} className="rounded-lg px-2 py-1 font-semibold text-slate-600 hover:bg-white hover:text-slate-900">Torna allo studio</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
