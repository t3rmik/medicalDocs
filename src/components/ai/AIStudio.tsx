'use client'

import { useState } from 'react'
import { markdownToHtml, markdownToPlainText } from '@/lib/markdown'
import {
  X,
  Sparkles,
  FileText,
  ListTree,
  Layers,
  HelpCircle,
  BookOpen,
  Wand2,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'

type AIAction = 'summarize' | 'outline' | 'flashcards' | 'quiz' | 'explain' | 'rewrite' | 'ask'

interface AIStudioProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  content: string;
  onInsert: (result: string, actionLabel: string) => void;
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

export function AIStudio({ isOpen, onClose, documentTitle, content, onInsert }: AIStudioProps) {
  const [selectedAction, setSelectedAction] = useState<AIAction>('summarize')
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState('')
  const [generationInfo, setGenerationInfo] = useState<{
    provider: string;
    model: string;
    fallbackUsed: boolean;
  } | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [retryMessage, setRetryMessage] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const currentAction = ACTIONS.find((action) => action.id === selectedAction) || ACTIONS[0]

  const runAction = async (action: AIAction = selectedAction) => {
    setSelectedAction(action); setIsLoading(true); setError(''); setResult(''); setGenerationInfo(null); setRetryMessage(''); setCopied(false);
    const plainText = extractPlainText(content);
    if (plainText.length < 2) { setError('Questo documento non contiene testo sufficiente. Aggiungi del testo e riprova.'); setIsLoading(false); return; }
    try {
      const body = JSON.stringify({ action, content: plainText, instruction: instruction.trim() });
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
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-3 py-5 backdrop-blur-sm sm:px-6 sm:py-10"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section className="my-auto flex max-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-[#f8fbfc] shadow-2xl shadow-slate-950/30 ring-1 ring-slate-950/5 sm:max-h-[calc(100vh-5rem)]" role="dialog" aria-modal="true" aria-labelledby="ai-studio-title">
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
                    onClick={() => { setSelectedAction(action.id); setError(''); setResult(''); setGenerationInfo(null); setCopied(false) }}
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

            <div className="mt-5 flex min-h-[150px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-3">
                <span className="text-xs font-semibold text-slate-700">Risultato</span>
                {result && (
                  <div className="flex flex-wrap items-center gap-1">
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
    </div>
  )
}
