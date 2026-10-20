'use client'

import { useEffect, useRef, useState } from 'react'
import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'

export interface InkStroke { d: string; color: string; width: number }

function readStrokes(value: unknown): InkStroke[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is InkStroke =>
    Boolean(item) && typeof item === 'object' &&
    typeof (item as InkStroke).d === 'string' &&
    typeof (item as InkStroke).color === 'string' &&
    Number.isFinite((item as InkStroke).width)
  )
}
function parseStoredStrokes(value: string | null): InkStroke[] {
  if (!value) return []
  try { return readStrokes(JSON.parse(value)) } catch { return [] }
}

function InkLayerView({ node, editor, updateAttributes }: NodeViewProps) {
  const root = editor.view.dom as HTMLElement
  const enabled = Boolean(node.attrs.enabled)
  const paths = readStrokes(node.attrs.paths)
  const width = Math.max(1, Number(node.attrs.width) || root.clientWidth || 800)
  const height = Math.max(1, Number(node.attrs.height) || root.scrollHeight || root.clientHeight || 1122)
  const color = typeof node.attrs.color === 'string' ? node.attrs.color : '#154e73'
  const brushSize = Math.max(0.8, Math.min(16, Number(node.attrs.brushSize) || 2.4))
  const inputMode = node.attrs.inputMode === 'finger' ? 'finger' : 'pen'
  const [liveStroke, setLiveStroke] = useState<InkStroke | null>(null)
  const activeStrokeRef = useRef<InkStroke | null>(null)
  const activePointerRef = useRef<number | null>(null)

  useEffect(() => {
    const syncDimensions = () => {
      const nextWidth = Math.max(1, Math.round(root.clientWidth || root.getBoundingClientRect().width))
      const nextHeight = Math.max(1, Math.round(root.scrollHeight || root.clientHeight))
      if (Math.abs(nextWidth - Number(node.attrs.width || 0)) > 3 ||
          Math.abs(nextHeight - Number(node.attrs.height || 0)) > 3) updateAttributes({ width: nextWidth, height: nextHeight })
    }
    syncDimensions()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncDimensions)
      return () => window.removeEventListener('resize', syncDimensions)
    }
    const observer = new ResizeObserver(syncDimensions)
    observer.observe(root)
    return () => observer.disconnect()
  }, [root, node.attrs.width, node.attrs.height, updateAttributes])

  const getPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = root.getBoundingClientRect()
    return { x: Math.max(0, Math.min(width, event.clientX - rect.left)), y: Math.max(0, Math.min(height, event.clientY - rect.top)) }
  }
  const startStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || (event.pointerType === 'touch' && inputMode !== 'finger')) return
    if (event.button !== 0 && event.pointerType !== 'pen' && event.pointerType !== 'touch') return
    event.preventDefault()
    const point = getPoint(event)
    const pressureWidth = event.pointerType === 'pen' && event.pressure > 0 ? brushSize * (0.55 + event.pressure * 0.9) : brushSize
    const stroke: InkStroke = { d: 'M ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1), color, width: pressureWidth }
    activeStrokeRef.current = stroke
    activePointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    setLiveStroke(stroke)
  }
  const continueStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = activeStrokeRef.current
    if (!enabled || !current || activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    const point = getPoint(event)
    const pressureWidth = event.pointerType === 'pen' && event.pressure > 0 ? brushSize * (0.55 + event.pressure * 0.9) : brushSize
    const next = { ...current, d: current.d + ' L ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1), width: pressureWidth }
    activeStrokeRef.current = next
    setLiveStroke(next)
  }
  const finishStroke = (event?: React.PointerEvent<HTMLDivElement>) => {
    const current = activeStrokeRef.current
    if (!current || (event && activePointerRef.current !== event.pointerId)) return
    updateAttributes({
      paths: [...paths, current],
      width: Math.max(1, Math.round(root.clientWidth || width)),
      height: Math.max(1, Math.round(root.scrollHeight || height)),
    })
    activeStrokeRef.current = null
    activePointerRef.current = null
    setLiveStroke(null)
  }

  return (
    <NodeViewWrapper
      as="div" className="medicaldocs-ink-layer" contentEditable={false}
      data-md-ink-active={enabled ? 'true' : 'false'}
      style={{
        position: 'absolute', inset: '0 auto auto 0', width: '100%',
        height: String(height) + 'px', minHeight: String(height) + 'px',
        zIndex: enabled ? 30 : 5, pointerEvents: enabled ? 'auto' : 'none',
        touchAction: enabled ? 'none' : 'auto', cursor: enabled ? 'crosshair' : 'default',
      }}
      onPointerDown={startStroke} onPointerMove={continueStroke}
      onPointerUp={finishStroke} onPointerCancel={finishStroke}
      onLostPointerCapture={() => finishStroke()}
      aria-label={enabled ? 'Scrittura a mano attiva sul foglio' : 'Livello di scrittura a mano'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={'0 0 ' + width + ' ' + height}
        preserveAspectRatio="none" aria-hidden="true"
        style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        {paths.map((stroke, index) => <path key={String(index) + '-' + String(stroke.d.length)} d={stroke.d} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
        {liveStroke && <path d={liveStroke.d} fill="none" stroke={liveStroke.color} strokeWidth={liveStroke.width} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </NodeViewWrapper>
  )
}

export const InkLayer = Node.create({
  name: 'medicalInkLayer',
  group: 'block',
  atom: true,
  selectable: false,
  draggable: false,
  addAttributes() {
    return {
      paths: { default: [] }, width: { default: 800 }, height: { default: 1122 },
      enabled: { default: false }, color: { default: '#154e73' },
      brushSize: { default: 2.4 }, inputMode: { default: 'pen' },
    }
  },
  parseHTML() {
    return [{
      tag: 'div[data-medicaldocs-ink-layer]',
      getAttrs: (dom) => {
        const element = dom as HTMLElement
        return {
          paths: parseStoredStrokes(element.getAttribute('data-ink-paths')),
          width: Math.max(1, Number(element.getAttribute('data-ink-width')) || 800),
          height: Math.max(1, Number(element.getAttribute('data-ink-height')) || 1122),
          enabled: false,
          color: element.getAttribute('data-ink-color') || '#154e73',
          brushSize: Math.max(0.8, Number(element.getAttribute('data-ink-brush-size')) || 2.4),
          inputMode: 'pen',
        }
      },
    }]
  },
  renderHTML({ node }) {
    const paths = readStrokes(node.attrs.paths)
    const width = Math.max(1, Number(node.attrs.width) || 800)
    const height = Math.max(1, Number(node.attrs.height) || 1122)
    return [
      'div',
      {
        'data-medicaldocs-ink-layer': 'true',
        'data-ink-paths': JSON.stringify(paths),
        'data-ink-width': String(width),
        'data-ink-height': String(height),
        'data-ink-color': String(node.attrs.color || '#154e73'),
        'data-ink-brush-size': String(node.attrs.brushSize || 2.4),
        class: 'medicaldocs-ink-layer', contenteditable: 'false',
      },
      ['svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 ' + width + ' ' + height,
        width: '100%', height: String(height), preserveAspectRatio: 'none', 'aria-hidden': 'true',
      }, ...paths.map((stroke) => ['path', {
        d: stroke.d, fill: 'none', stroke: stroke.color, 'stroke-width': String(stroke.width),
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }])],
    ]
  },
  addNodeView() { return ReactNodeViewRenderer(InkLayerView) },
})
