'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface EditorErrorBoundaryProps {
  children: ReactNode
}
interface EditorErrorBoundaryState {
  hasError: boolean
  resetKey: number
}

/**
 * Keeps a ProseMirror/React NodeView error from taking down the entire app shell.
 * The error is logged in the browser console so it can be diagnosed if it recurs.
 */
export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  state: EditorErrorBoundaryState = { hasError: false, resetKey: 0 }

  static getDerivedStateFromError(): Partial<EditorErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MedicalDocs] Errore nel componente editor; il resto della pagina è stato preservato.', error, info.componentStack)
  }

  retryEditor = () => {
    this.setState((state) => ({ hasError: false, resetKey: state.resetKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          data-md-editor-recovery="true"
          role="alert"
          className="flex min-h-[45vh] w-full items-center justify-center bg-slate-50 p-6"
        >
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-lg shadow-slate-900/5">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl" aria-hidden="true">!</div>
            <h2 className="text-base font-bold text-slate-900">L’editor ha incontrato un problema</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Abbiamo isolato l’errore per evitare che scompaia tutta la pagina. Le modifiche già salvate restano nel documento; quelle ancora in attesa di autosalvataggio potrebbero non essere disponibili.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={this.retryEditor}
                className="min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Riprova editor
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ricarica pagina
              </button>
            </div>
          </div>
        </section>
      )
    }

    return <div key={this.state.resetKey} className="contents">{this.props.children}</div>
  }
}
