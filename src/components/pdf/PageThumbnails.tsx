'use client'

import { useEffect, useRef, useState } from 'react'

interface PageThumbnailsProps {
  pdfDoc: any
  totalPages: number
  currentPage: number
  onPageSelect: (pageNumber: number) => void
}

function ThumbnailCanvas({ pdfDoc, pageNumber }: { pdfDoc: any; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const card = canvas?.parentElement
    if (!card) return
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }
    const root = card.closest('[data-md-pdf-thumbnails="true"]')
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true)
        observer.disconnect()
      }
    }, { root: root instanceof Element ? root : null, rootMargin: '180px' })
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!pdfDoc || !nearViewport) return
    let cancelled = false
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null
    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (cancelled) return
        const viewport = page.getViewport({ scale: 0.17 })
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d', { alpha: false })
        if (!canvas || !context || cancelled) return
        canvas.width = Math.max(1, Math.ceil(viewport.width))
        canvas.height = Math.max(1, Math.ceil(viewport.height))
        const task = page.render({ canvasContext: context, viewport })
        renderTask = task
        await task.promise
      } catch (error) {
        const name = error && typeof error === 'object' && 'name' in error
          ? String((error as { name?: unknown }).name)
          : ''
        if (!cancelled && name !== 'RenderingCancelledException') setFailed(true)
      }
    }
    void renderThumbnail()
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDoc, pageNumber, nearViewport])

  return (
    <div className="flex min-h-[68px] w-full items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-inner">
      {failed ? (
        <span className="px-1 text-center text-[10px] leading-4 text-slate-500">Anteprima non disponibile</span>
      ) : (
        <canvas ref={canvasRef} aria-hidden="true" className="block h-auto max-h-24 max-w-full rounded-sm object-contain" />
      )}
    </div>
  )
}

export function PageThumbnails({ pdfDoc, totalPages, currentPage, onPageSelect }: PageThumbnailsProps) {
  const containerRef = useRef<HTMLElement>(null)
  const virtualize = totalPages > 180
  const [horizontal, setHorizontal] = useState(false)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(totalPages, 48) })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWindow = () => {
      const isRow = window.getComputedStyle(container).flexDirection.startsWith('row')
      setHorizontal((previous) => previous === isRow ? previous : isRow)
      if (!virtualize) {
        setVisibleRange((previous) => previous.start === 0 && previous.end === totalPages ? previous : { start: 0, end: totalPages })
        return
      }
      const itemExtent = isRow ? 68 : 104
      const offset = isRow ? container.scrollLeft : container.scrollTop
      const viewport = isRow ? container.clientWidth : container.clientHeight
      const start = Math.max(0, Math.floor(offset / itemExtent) - 12)
      const end = Math.min(totalPages, Math.max(start + 1, Math.ceil((offset + viewport) / itemExtent) + 12))
      setVisibleRange((previous) => previous.start === start && previous.end === end ? previous : { start, end })
    }
    container.addEventListener('scroll', updateWindow, { passive: true })
    window.addEventListener('resize', updateWindow)
    window.addEventListener('orientationchange', updateWindow)
    updateWindow()
    return () => {
      container.removeEventListener('scroll', updateWindow)
      window.removeEventListener('resize', updateWindow)
      window.removeEventListener('orientationchange', updateWindow)
    }
  }, [totalPages, virtualize])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (virtualize) {
      const itemExtent = horizontal ? 68 : 104
      const viewport = horizontal ? container.clientWidth : container.clientHeight
      const offset = Math.max(0, (currentPage - 1) * itemExtent - viewport * 0.35)
      if (horizontal) container.scrollLeft = offset
      else container.scrollTop = offset
    } else {
      const selected = container.querySelector<HTMLElement>('[aria-current="page"]')
      selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [currentPage, totalPages, horizontal, virtualize])

  const start = virtualize ? Math.min(visibleRange.start, Math.max(0, totalPages - 1)) : 0
  const end = virtualize ? Math.min(totalPages, Math.max(start + 1, visibleRange.end)) : totalPages
  const pageNumbers = Array.from({ length: Math.max(0, end - start) }, (_, index) => index + start + 1)
  const extent = horizontal ? 68 : 104

  return (
    <nav ref={containerRef} data-md-pdf-thumbnails="true" aria-label="Miniature e navigazione pagine PDF"
      className="flex shrink-0 flex-col overflow-y-auto border-r border-slate-700 bg-slate-900 p-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Pagine · {totalPages}</p>

      {virtualize && start > 0 && <div aria-hidden="true" data-md-pdf-thumbnail-spacer="true" style={horizontal
        ? { width: start * extent, height: 1, flex: '0 0 auto' }
        : { height: start * extent, width: 1, flex: '0 0 auto' }} />}

      {pageNumbers.map((pageNumber) => (
        <button key={pageNumber} type="button" data-md-pdf-thumbnail-select="true"
          onClick={() => onPageSelect(pageNumber)}
          aria-label={'Vai alla pagina ' + pageNumber}
          aria-current={currentPage === pageNumber ? 'page' : undefined}
          className={[
            'rounded-xl border p-1.5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300',
            currentPage === pageNumber
              ? 'border-teal-400 bg-teal-950/70 text-teal-100 shadow-[0_0_0_2px_rgba(45,212,191,0.10)]'
              : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
          ].join(' ')}>
          <ThumbnailCanvas pdfDoc={pdfDoc} pageNumber={pageNumber} />
          <span className="mt-1 block text-[11px] font-semibold">Pagina {pageNumber}</span>
        </button>
      ))}

      {virtualize && end < totalPages && <div aria-hidden="true" data-md-pdf-thumbnail-spacer="true" style={horizontal
        ? { width: (totalPages - end) * extent, height: 1, flex: '0 0 auto' }
        : { height: (totalPages - end) * extent, width: 1, flex: '0 0 auto' }} />}
    </nav>
  )
}
