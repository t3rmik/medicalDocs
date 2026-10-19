'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine, RotateCcw, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface DrawingPadProps {
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
}

export function DrawingPad({ onClose, onInsert }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const hasInkRef = useRef(false)
  const [color, setColor] = useState('#1d4ed8')
  const [brushSize, setBrushSize] = useState(3)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }, [])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType !== 'pen') return
    event.preventDefault()
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const point = getPoint(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.strokeStyle = color
    context.lineWidth = brushSize * (canvas.width / canvas.getBoundingClientRect().width)
    hasInkRef.current = true
  }

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    event.preventDefault()
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const point = getPoint(event)
    const pressureFactor = event.pointerType === 'pen' && event.pressure > 0 ? 0.65 + event.pressure : 1
    context.lineWidth = brushSize * pressureFactor * (canvas.width / canvas.getBoundingClientRect().width)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const stopDrawing = () => {
    drawingRef.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    hasInkRef.current = false
  }

  const insertDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasInkRef.current) {
      toast.error('Scrivi o disegna qualcosa prima di inserirlo.')
      return
    }
    onInsert(canvas.toDataURL('image/png'))
    onClose()
    toast.success('Disegno inserito negli appunti.')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="drawing-pad-title">
      <div className="flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><PenLine className="h-5 w-5" /></div>
            <div>
              <h2 id="drawing-pad-title" className="font-semibold text-slate-900">Scrivi a mano libera</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Usa penna touch, stilo o mouse. Il foglio verrà inserito come immagine nel documento.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" aria-label="Chiudi lavagna">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            Colore
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
          </label>
          <label className="flex min-w-40 flex-1 items-center gap-3 text-xs font-medium text-slate-600 sm:max-w-64">
            Spessore
            <input type="range" min="1" max="9" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} className="w-full accent-blue-600" />
            <span className="w-4 text-right tabular-nums">{brushSize}</span>
          </label>
          <button type="button" onClick={() => setColor('#ffffff')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
            <Eraser className="h-4 w-4" /> Gomma
          </button>
          <button type="button" onClick={clearCanvas} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
            <RotateCcw className="h-4 w-4" /> Cancella foglio
          </button>
          {color === '#ffffff' && (
            <button type="button" onClick={() => setColor('#1d4ed8')} className="rounded-lg px-2 py-1 text-xs text-blue-700 hover:bg-blue-50">Torna alla penna</button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">
          <canvas
            ref={canvasRef}
            width={1400}
            height={620}
            className="block w-full touch-none rounded-xl border border-slate-200 bg-white shadow-inner"
            style={{ aspectRatio: '1400 / 620', cursor: 'crosshair' }}
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onLostPointerCapture={stopDrawing}
            aria-label="Area per scrivere a mano libera"
          />
          <p className="mt-2 text-center text-[11px] text-slate-400">Suggerimento: lo stilo attivo offre il tratto più naturale. L’immagine può essere ridimensionata dopo l’inserimento.</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Annulla</button>
          <button type="button" onClick={insertDrawing} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <Check className="h-4 w-4" /> Inserisci nel documento
          </button>
        </div>
      </div>
    </div>
  )
}
