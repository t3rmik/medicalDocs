'use client'

import { useEffect, useRef, useState } from 'react'
import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'

export type InkTool = 'pen' | 'highlighter' | 'eraser' | 'select'
export interface InkStroke {
  id: string
  d: string
  color: string
  width: number
  opacity: number
  tx: number
  ty: number
  sx: number
  sy: number
}
type Point = { x: number; y: number }
type Bounds = { left: number; top: number; right: number; bottom: number }
type LiveTransform = { id: string; tx: number; ty: number; sx: number; sy: number }
type Gesture = {
  pointerId: number
  kind: 'draw' | 'erase' | 'move' | 'resize'
  start: Point
  stroke?: InkStroke
  originalPaths: InkStroke[]
  originalBounds?: Bounds
  startTransform?: LiveTransform
  livePaths?: InkStroke[]
}

function normaliseStroke(value: unknown, index: number): InkStroke | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<InkStroke>
  if (typeof item.d !== 'string' || typeof item.color !== 'string' || !Number.isFinite(item.width)) return null
  return {
    id: typeof item.id === 'string' ? item.id : 'legacy-' + index + '-' + item.d.length,
    d: item.d,
    color: item.color,
    width: Math.max(0.5, Number(item.width) || 2.4),
    opacity: Math.max(0.05, Math.min(1, Number(item.opacity) || 1)),
    tx: Number.isFinite(item.tx) ? Number(item.tx) : 0,
    ty: Number.isFinite(item.ty) ? Number(item.ty) : 0,
    sx: Number.isFinite(item.sx) ? Math.max(0.2, Number(item.sx)) : 1,
    sy: Number.isFinite(item.sy) ? Math.max(0.2, Number(item.sy)) : 1,
  }
}
function readStrokes(value: unknown): InkStroke[] {
  if (!Array.isArray(value)) return []
  return value.map(normaliseStroke).filter((stroke): stroke is InkStroke => stroke !== null)
}
function parseStoredStrokes(value: string | null): InkStroke[] {
  if (!value) return []
  try { return readStrokes(JSON.parse(value)) } catch { return [] }
}
function pointsFor(stroke: InkStroke): Point[] {
  const points: Point[] = []
  const regex = /[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(stroke.d))) points.push({ x: Number(match[1]), y: Number(match[2]) })
  return points
}
function transformPoint(point: Point, stroke: InkStroke): Point {
  const points = pointsFor(stroke)
  if (!points.length) return point
  const xs = points.map((item) => item.x)
  const ys = points.map((item) => item.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return {
    x: cx + (point.x - cx) * stroke.sx + stroke.tx,
    y: cy + (point.y - cy) * stroke.sy + stroke.ty,
  }
}
function boundsFor(stroke: InkStroke): Bounds | null {
  const points = pointsFor(stroke).map((point) => transformPoint(point, stroke))
  if (!points.length) return null
  const pad = Math.max(5, stroke.width * 1.5)
  return {
    left: Math.min(...points.map((point) => point.x)) - pad,
    top: Math.min(...points.map((point) => point.y)) - pad,
    right: Math.max(...points.map((point) => point.x)) + pad,
    bottom: Math.max(...points.map((point) => point.y)) + pad,
  }
}
function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return Math.hypot(point.x - a.x, point.y - a.y)
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}
function distanceToStroke(point: Point, stroke: InkStroke): number {
  const points = pointsFor(stroke).map((item) => transformPoint(item, stroke))
  if (!points.length) return Infinity
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y)
  let nearest = Infinity
  for (let index = 1; index < points.length; index += 1) nearest = Math.min(nearest, distanceToSegment(point, points[index - 1], points[index]))
  return nearest
}
function clampScale(value: number) { return Math.max(0.2, Math.min(5, value)) }

function InkLayerView({ node, editor, updateAttributes }: NodeViewProps) {
  const root = editor.view.dom as HTMLElement
  const enabled = Boolean(node.attrs.enabled)
  const paths = readStrokes(node.attrs.paths)
  const undoStack = Array.isArray(node.attrs.undoStack) ? node.attrs.undoStack as InkStroke[][] : []
  const redoStack = Array.isArray(node.attrs.redoStack) ? node.attrs.redoStack as InkStroke[][] : []
  const width = Math.max(1, Number(node.attrs.width) || root.clientWidth || 800)
  const height = Math.max(1, Number(node.attrs.height) || root.scrollHeight || root.clientHeight || 1122)
  const color = typeof node.attrs.color === 'string' ? node.attrs.color : '#154e73'
  const brushSize = Math.max(0.8, Math.min(16, Number(node.attrs.brushSize) || 2.4))
  const tool: InkTool = ['pen', 'highlighter', 'eraser', 'select'].includes(node.attrs.tool) ? node.attrs.tool : 'pen'
  const inputMode = node.attrs.inputMode === 'finger' ? 'finger' : 'pen'
  const selectedId = typeof node.attrs.selectedId === 'string' ? node.attrs.selectedId : null
  const [liveStroke, setLiveStroke] = useState<InkStroke | null>(null)
  const [liveTransform, setLiveTransform] = useState<LiveTransform | null>(null)
  const [previewPaths, setPreviewPaths] = useState<InkStroke[] | null>(null)
  const gestureRef = useRef<Gesture | null>(null)

  useEffect(() => {
    const syncDimensions = () => {
      const nextWidth = Math.max(1, Math.round(root.clientWidth || root.getBoundingClientRect().width))
      const nextHeight = Math.max(1, Math.round(root.scrollHeight || root.clientHeight))
      if (Math.abs(nextWidth - Number(node.attrs.width || 0)) > 3 || Math.abs(nextHeight - Number(node.attrs.height || 0)) > 3) {
        updateAttributes({ width: nextWidth, height: nextHeight })
      }
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

  const svgRef = useRef<SVGSVGElement | null>(null)
  const getPoint = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (svg && matrix) {
      try {
        const screenPoint = svg.createSVGPoint()
        screenPoint.x = event.clientX
        screenPoint.y = event.clientY
        const local = screenPoint.matrixTransform(matrix.inverse())
        return { x:Math.max(0,Math.min(width,local.x)), y:Math.max(0,Math.min(height,local.y)) }
      } catch { /* Fallback for browsers without a usable screen matrix. */ }
    }
    const rect=svg?.getBoundingClientRect()??root.getBoundingClientRect()
    return {
      x:Math.max(0,Math.min(width,(event.clientX-rect.left)*width/Math.max(1,rect.width))),
      y:Math.max(0,Math.min(height,(event.clientY-rect.top)*height/Math.max(1,rect.height))),
    }
  }
  const commitPaths = (nextPaths: InkStroke[]) => {
    updateAttributes({ paths: nextPaths, undoStack: [...undoStack, paths].slice(-60), redoStack: [] })
  }
  const findNearestStroke = (point: Point, source = paths) => {
    let nearest: InkStroke | null = null
    let nearestDistance = Infinity
    for (let index = source.length - 1; index >= 0; index -= 1) {
      const stroke = source[index]
      const distance = distanceToStroke(point, stroke)
      if (distance < nearestDistance) { nearest = stroke; nearestDistance = distance }
    }
    return nearest && nearestDistance <= Math.max(14, nearest.width * 2.5) ? nearest : null
  }
  const eraseAt = (point: Point, source: InkStroke[]) => {
    const nearest = findNearestStroke(point, source)
    return nearest ? source.filter((stroke) => stroke.id !== nearest.id) : source
  }

  const startGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return
    if (event.pointerType === 'touch' && inputMode !== 'finger' && (tool === 'pen' || tool === 'highlighter' || tool === 'eraser')) return
    if (event.button !== 0 && event.pointerType !== 'pen' && event.pointerType !== 'touch') return
    const point = getPoint(event)

    if (tool === 'select') {
      const selected = paths.find((stroke) => stroke.id === selectedId)
      const selectedBounds = selected ? boundsFor(selected) : null
      const handleHit = selectedBounds && point.x >= selectedBounds.right - 18 && point.y >= selectedBounds.bottom - 18 &&
        point.x <= selectedBounds.right + 14 && point.y <= selectedBounds.bottom + 14
      if (selected && selectedBounds && handleHit) {
        event.preventDefault()
        gestureRef.current = {
          pointerId: event.pointerId, kind: 'resize', start: point, stroke: selected, originalPaths: paths,
          originalBounds: selectedBounds, startTransform: { id: selected.id, tx: selected.tx, ty: selected.ty, sx: selected.sx, sy: selected.sy },
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
      const hit = findNearestStroke(point)
      updateAttributes({ selectedId: hit?.id ?? null })
      if (!hit) return
      event.preventDefault()
      gestureRef.current = {
        pointerId: event.pointerId, kind: 'move', start: point, stroke: hit, originalPaths: paths,
        originalBounds: boundsFor(hit) ?? undefined,
        startTransform: { id: hit.id, tx: hit.tx, ty: hit.ty, sx: hit.sx, sy: hit.sy },
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'eraser') {
      gestureRef.current = { pointerId: event.pointerId, kind: 'erase', start: point, originalPaths: paths, livePaths: eraseAt(point, paths) }
      setPreviewPaths(eraseAt(point, paths))
      return
    }

    const highlighter = tool === 'highlighter'
    const stroke: InkStroke = {
      id: 'ink-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      d: 'M ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1),
      color: highlighter ? (color === '#154e73' ? '#facc15' : color) : color,
      width: highlighter ? brushSize * 3.3 : brushSize,
      opacity: highlighter ? 0.3 : 1,
      tx: 0, ty: 0, sx: 1, sy: 1,
    }
    gestureRef.current = { pointerId: event.pointerId, kind: 'draw', start: point, stroke, originalPaths: paths }
    setLiveStroke(stroke)
  }

  const moveGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!enabled || !gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.kind !== 'move' && gesture.kind !== 'resize') event.preventDefault()
    const point = getPoint(event)
    if (gesture.kind === 'draw' && gesture.stroke) {
      const pressureWidth = event.pointerType === 'pen' && event.pressure > 0
        ? brushSize * (gesture.stroke.opacity < 1 ? 3.3 : 1) * (0.55 + event.pressure * 0.9)
        : gesture.stroke.width
      const nextStroke = { ...gesture.stroke, d: gesture.stroke.d + ' L ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1), width: pressureWidth }
      gesture.stroke = nextStroke
      setLiveStroke(nextStroke)
      return
    }
    if (gesture.kind === 'erase') {
      const currentPaths = gesture.livePaths ?? gesture.originalPaths
      const nextPaths = eraseAt(point, currentPaths)
      if (nextPaths.length !== currentPaths.length) {
        gesture.livePaths = nextPaths
        setPreviewPaths(nextPaths)
      }
      return
    }
    if (!gesture.stroke || !gesture.startTransform) return
    const start = gesture.startTransform
    let transform: LiveTransform
    if (gesture.kind === 'move') {
      transform = { ...start, tx: start.tx + point.x - gesture.start.x, ty: start.ty + point.y - gesture.start.y }
    } else {
      const bounds = gesture.originalBounds
      if (!bounds) return
      const initialWidth = Math.max(8, bounds.right - bounds.left)
      const initialHeight = Math.max(8, bounds.bottom - bounds.top)
      transform = {
        ...start,
        sx: clampScale(start.sx * ((point.x - bounds.left) / initialWidth)),
        sy: clampScale(start.sy * ((point.y - bounds.top) / initialHeight)),
      }
    }
    setLiveTransform(transform)
  }

  const finishGesture = (event?: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || (event && gesture.pointerId !== event.pointerId)) return
    if (gesture.kind === 'draw' && gesture.stroke) {
      const currentPaths = readStrokes(node.attrs.paths)
      updateAttributes({ paths: [...currentPaths, gesture.stroke], undoStack: [...undoStack, currentPaths].slice(-60), redoStack: [] })
    } else if (gesture.kind === 'erase') {
      const nextPaths = gesture.livePaths ?? gesture.originalPaths
      if (nextPaths.length !== gesture.originalPaths.length) {
        updateAttributes({
          paths: nextPaths, undoStack: [...undoStack, gesture.originalPaths].slice(-60),
          redoStack: [], selectedId: null,
        })
      }
      setPreviewPaths(null)
    } else if ((gesture.kind === 'move' || gesture.kind === 'resize') && gesture.stroke && liveTransform) {
      const nextPaths = gesture.originalPaths.map((stroke) => stroke.id === liveTransform.id ? { ...stroke, ...liveTransform } : stroke)
      updateAttributes({ paths: nextPaths, undoStack: [...undoStack, gesture.originalPaths].slice(-60), redoStack: [] })
    }
    gestureRef.current = null
    setLiveStroke(null)
    setLiveTransform(null)
  }

  const visiblePaths = previewPaths ?? paths
  return (
    <NodeViewWrapper
      as="div" className="medicaldocs-ink-layer" contentEditable={false}
      data-md-ink-active={enabled ? 'true' : 'false'} data-md-ink-tool={tool}
      style={{
        position: 'absolute', inset: '0 auto auto 0', width: '100%',
        height: String(height) + 'px', minHeight: String(height) + 'px',
        zIndex: enabled ? 30 : 5, pointerEvents: enabled ? 'auto' : 'none',
        touchAction: enabled ? (inputMode === 'pen' ? 'pan-x pan-y pinch-zoom' : 'none') : 'auto', cursor: !enabled ? 'default' : tool === 'select' ? 'move' : tool === 'eraser' ? 'cell' : 'crosshair',
      }}
      onPointerDown={startGesture} onPointerMove={moveGesture} onPointerUp={finishGesture}
      onPointerCancel={finishGesture} onLostPointerCapture={() => finishGesture()}
      aria-label={enabled ? 'Strumenti penna attivi sul foglio' : 'Livello di scrittura a mano'}
    >
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={'0 0 ' + width + ' ' + height}
        preserveAspectRatio="none" aria-hidden="true"
        style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        {visiblePaths.map((stroke) => {
          const points = pointsFor(stroke)
          const cx = points.length ? (Math.min(...points.map((item) => item.x)) + Math.max(...points.map((item) => item.x))) / 2 : 0
          const cy = points.length ? (Math.min(...points.map((item) => item.y)) + Math.max(...points.map((item) => item.y))) / 2 : 0
          const transform = 'translate(' + stroke.tx + ' ' + stroke.ty + ') translate(' + cx + ' ' + cy + ') scale(' + stroke.sx + ' ' + stroke.sy + ') translate(' + (-cx) + ' ' + (-cy) + ')'
          return <g key={stroke.id} transform={transform}>
            <path d={stroke.d} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        })}
        {liveStroke && <path d={liveStroke.d} fill="none" stroke={liveStroke.color} strokeWidth={liveStroke.width} strokeOpacity={liveStroke.opacity} strokeLinecap="round" strokeLinejoin="round" />}
        {liveTransform && (() => {
          const selected = paths.find((stroke) => stroke.id === liveTransform.id)
          if (!selected) return null
          const bounds = boundsFor({ ...selected, ...liveTransform })
          if (!bounds) return null
          return <rect x={bounds.left} y={bounds.top} width={Math.max(1, bounds.right - bounds.left)} height={Math.max(1, bounds.bottom - bounds.top)} rx="5" fill="rgba(79,70,229,0.05)" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="5 4" />
        })()}
        {!liveTransform && tool === 'select' && selectedId && (() => {
          const selected = paths.find((stroke) => stroke.id === selectedId)
          const bounds = selected ? boundsFor(selected) : null
          if (!bounds) return null
          return <g>
            <rect x={bounds.left} y={bounds.top} width={Math.max(1, bounds.right - bounds.left)} height={Math.max(1, bounds.bottom - bounds.top)} rx="5" fill="rgba(79,70,229,0.04)" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="5 4" />
            <circle cx={bounds.right} cy={bounds.bottom} r="7" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
          </g>
        })()}
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
      color: { default: '#154e73', rendered: true }, brushSize: { default: 2.4, rendered: true },
      enabled: { default: false, rendered: false }, tool: { default: 'pen', rendered: false },
      selectedId: { default: null, rendered: false }, inputMode: { default: 'pen', rendered: false },
      undoStack: { default: [], rendered: false }, redoStack: { default: [], rendered: false },
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
          enabled: false, tool: 'pen', selectedId: null, inputMode: 'pen', undoStack: [], redoStack: [],
          color: element.getAttribute('data-ink-color') || '#154e73',
          brushSize: Math.max(0.8, Number(element.getAttribute('data-ink-brush-size')) || 2.4),
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
        'data-medicaldocs-ink-layer': 'true', 'data-ink-paths': JSON.stringify(paths),
        'data-ink-width': String(width), 'data-ink-height': String(height),
        'data-ink-color': String(node.attrs.color || '#154e73'),
        'data-ink-brush-size': String(node.attrs.brushSize || 2.4),
        class: 'medicaldocs-ink-layer', contenteditable: 'false',
      },
      ['svg', {
        xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 ' + width + ' ' + height,
        width: '100%', height: String(height), preserveAspectRatio: 'none', 'aria-hidden': 'true',
      }, ...paths.map((stroke) => {
        const points = pointsFor(stroke)
        const cx = points.length ? (Math.min(...points.map((point) => point.x)) + Math.max(...points.map((point) => point.x))) / 2 : 0
        const cy = points.length ? (Math.min(...points.map((point) => point.y)) + Math.max(...points.map((point) => point.y))) / 2 : 0
        return ['path', {
          d: stroke.d, fill: 'none', stroke: stroke.color, 'stroke-width': String(stroke.width),
          'stroke-opacity': String(stroke.opacity), 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          transform: 'translate(' + stroke.tx + ' ' + stroke.ty + ') translate(' + cx + ' ' + cy + ') scale(' + stroke.sx + ' ' + stroke.sy + ') translate(' + (-cx) + ' ' + (-cy) + ')',
        }] as [string, Record<string, string>]
      })],
    ]
  },
  addNodeView() { return ReactNodeViewRenderer(InkLayerView) },
})
