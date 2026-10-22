'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { copyMarkdownToClipboard, markdownToHtml, normalizeAIOutput } from '@/lib/markdown'
import {
  MedicalDocsSpark as Sparkles,
  MedicalDocsMessage as MessageSquare,
  MedicalDocsLoader as Loader2,
  MedicalDocsArrowUpRight as Send,
  MedicalDocsCopy as Copy,
  MedicalDocsCheckCircle as Check,
} from '@/components/icons/MedicalDocsIcons'

type StudyMessage = {
  role: 'user' | 'assistant'
  content: string
  provider?: string
  model?: string
  fallbackUsed?: boolean
}

const CHAT_STORAGE_KEY = 'medicaldocs.study-chat.history.v1'

const QUICK_PROMPTS = [
  { label: 'Fotosintesi', prompt: 'Spiegami la fotosintesi clorofilliana con le fasi, l’equazione generale e un modo semplice per ricordarla.' },
  { label: 'Mitosi o meiosi?', prompt: 'Confronta mitosi e meiosi in una tabella semplice: scopo, numero di divisioni, cellule prodotte e corredo cromosomico.' },
  { label: 'Legami chimici', prompt: 'Spiegami la differenza tra legame ionico, covalente polare e covalente apolare, con esempi.' },
  { label: 'Moli e stechiometria', prompt: 'Fammi capire il concetto di mole e mostrami come si affronta un semplice esercizio di stechiometria, passo per passo.' },
  { label: 'Metodo di studio', prompt: 'Aiutami a impostare un metodo di studio attivo per biologia e chimica, con ripasso dilazionato e quiz.' },
]

export function StudyChatPanel() {
  const [messages, setMessages] = useState<StudyMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) || '[]')
      if (Array.isArray(parsed)) {
        setMessages(parsed.filter((item): item is StudyMessage =>
          Boolean(item && typeof item === 'object' &&
            ((item as StudyMessage).role === 'user' || (item as StudyMessage).role === 'assistant') &&
            typeof (item as StudyMessage).content === 'string' &&
            (item as StudyMessage).content.length <= 12_000
          )
        ).slice(-20))
      }
    } catch {
      // Start a fresh in-memory chat when saved history is invalid.
    } finally {
      setHistoryLoaded(true)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  useEffect(() => {
    if (!historyLoaded) return
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-20)))
    } catch {
      // Chat still works for the current session when browser storage is unavailable.
    }
  }, [messages, historyLoaded])

  const ask = async (rawQuestion: string, isRetry = false) => {
    const prompt = rawQuestion.trim()
    if (!prompt || isSending) return
    setError('')
    setQuestion('')
    const lastMessage = messages[messages.length - 1]
    const retryingLastQuestion = isRetry && lastMessage?.role === 'user' && lastMessage.content === prompt
    if (!retryingLastQuestion) setMessages((current) => [...current, { role: 'user', content: prompt }])
    setIsSending(true)
    const contextMessages = retryingLastQuestion ? messages.slice(0, -1) : messages
    const history = contextMessages.slice(-10).map((message) => ({ role: message.role, content: message.content }))
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'study-chat',
          action: 'ask',
          content: '',
          instruction: prompt,
          messages: history,
        }),
      })
      const payload = await response.json().catch(() => ({})) as {
        result?: string
        error?: string
        provider?: string
        model?: string
        fallbackUsed?: boolean
      }
      if (!response.ok) throw new Error(payload.error || 'Il tutor non è riuscito a rispondere. Riprova.')
      if (typeof payload.result !== 'string' || !payload.result.trim()) throw new Error('Il tutor non ha restituito una risposta.')
      setMessages((current) => [...current, {
        role: 'assistant',
        content: normalizeAIOutput(payload.result!.trim()),
        provider: payload.provider,
        model: payload.model,
        fallbackUsed: payload.fallbackUsed,
      }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connessione non riuscita. Controlla la rete e riprova.')
    } finally {
      setIsSending(false)
      window.setTimeout(() => textareaRef.current?.focus(), 60)
    }
  }

  const copyAnswer = async (content: string, index: number) => {
    try {
      await copyMarkdownToClipboard(content)
      setCopiedMessageIndex(index)
      window.setTimeout(() => setCopiedMessageIndex((current) => current === index ? null : current), 1800)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Non è stato possibile copiare la risposta.')
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void ask(question)
  }

  const onTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void ask(question)
    }
  }

  const clearChat = () => {
    if (isSending) return
    setMessages([])
    setError('')
    setQuestion('')
  }

  return (
    <div data-md-study-chat="true" className="md-study-chat min-w-0">
      <div data-md-study-chat-intro="true" className="mb-2 flex min-w-0 items-center gap-2.5 rounded-xl border border-teal-100 bg-gradient-to-r from-[#f0fdfa] via-white to-[#edf8fb] px-2.5 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-700 to-cyan-700 text-white shadow-sm">
          <Sparkles size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold tracking-tight text-slate-900">Tutor di studio</p>
          <p className="truncate text-[11px] leading-4 text-slate-600">Domande libere su teoria e metodo di studio</p>
        </div>
      </div>

      <div data-md-study-chat-messages="true" className="space-y-3">
        {messages.length === 0 && (
          <div className="px-1 pb-2">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700">
              <MessageSquare size={15} />
              <span>Da dove iniziamo?</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_PROMPTS.map((item) => (
                <button key={item.label} type="button" disabled={isSending} onClick={() => void ask(item.prompt)} className="group flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold leading-5 text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50">
                  <span>{item.label}</span>
                  <span className="shrink-0 text-teal-700 transition group-hover:translate-x-0.5">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <article key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {message.role === 'user' ? (
              <div className="max-w-[92%] rounded-2xl rounded-br-md bg-gradient-to-br from-teal-700 to-cyan-800 px-3.5 py-2.5 text-sm leading-6 text-white shadow-sm">
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            ) : (
              <div className="min-w-0 max-w-[98%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-teal-800">
                    <Sparkles size={13} />
                    <span>Tutor di studio</span>
                  </div>
                  <button type="button" onClick={() => void copyAnswer(message.content, index)}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50"
                    aria-label={copiedMessageIndex === index ? 'Risposta copiata' : 'Copia risposta del tutor'}
                    title="Copia la risposta mantenendo titoli, elenchi e tabelle quando supportato">
                    {copiedMessageIndex === index ? <Check size={14} /> : <Copy size={14} />}
                    {copiedMessageIndex === index ? 'Copiato' : 'Copia'}
                  </button>
                </div>
                <div className="md-study-chat-answer break-words" dangerouslySetInnerHTML={{ __html: markdownToHtml(normalizeAIOutput(message.content)) }} />
                {message.model && (
                  <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    Modello: {message.model}{message.fallbackUsed ? ' · modello alternativo' : ''}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-900">
              <Loader2 size={16} className="animate-spin" />
              <span>Sto preparando la spiegazione…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs leading-5 text-rose-800">
          <p>{error}</p>
          <button type="button" onClick={() => { const lastQuestion = messages.filter((message) => message.role === 'user').slice(-1)[0]?.content; setError(''); if (lastQuestion) void ask(lastQuestion, true) }} className="mt-1 font-bold underline underline-offset-2">
            Riprova l’ultima domanda
          </button>
        </div>
      )}

      <form onSubmit={submit} className="mt-2 shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_4px_20px_-16px_rgba(8,47,73,.45)]">
        <label htmlFor="md-study-chat-question" className="sr-only">Fai una domanda al tutor di studio</label>
        <textarea
          id="md-study-chat-question"
          ref={textareaRef}
          rows={2}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          placeholder="Chiedi qualcosa di biologia, chimica…"
          maxLength={2500}
          className="w-full min-w-0 rounded-xl border border-transparent bg-white px-2.5 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-200 focus:ring-2 focus:ring-teal-50"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-400">
            <span>Invio invia</span>
            <span aria-hidden="true">·</span>
            <span className="hidden min-[640px]:inline">Maiusc + Invio va a capo</span>
          </div>
          {messages.length > 0 && (
            <button type="button" disabled={isSending} onClick={clearChat} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-40" aria-label="Inizia una nuova chat">
              Nuova
            </button>
          )}
          <button type="submit" disabled={isSending || question.trim().length < 3} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-3 text-xs font-bold text-white shadow-sm transition hover:from-teal-800 hover:to-cyan-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Invia domanda">
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Invia</span>
          </button>
        </div>
      </form>
      <p className="mt-1.5 px-1 text-[10px] leading-4 text-slate-400">Per domande difficili la risposta può essere più lunga. Verifica formule e concetti con il materiale del corso.</p>
    </div>
  )
}
