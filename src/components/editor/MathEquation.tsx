'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'

type MathSpec = [string, Record<string, string>, ...(MathSpec | string)[]]

const GREEK: Record<string, string> = {
  '\\alpha': 'α', '\\Alpha': 'Α', '\\beta': 'β', '\\Beta': 'Β',
  '\\gamma': 'γ', '\\Gamma': 'Γ', '\\delta': 'δ', '\\Delta': 'Δ',
  '\\epsilon': 'ε', '\\varepsilon': 'ϵ', '\\zeta': 'ζ', '\\eta': 'η',
  '\\theta': 'θ', '\\Theta': 'Θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\Lambda': 'Λ', '\\mu': 'μ', '\\nu': 'ν',
  '\\xi': 'ξ', '\\Xi': 'Ξ', '\\pi': 'π', '\\Pi': 'Π',
  '\\rho': 'ρ', '\\sigma': 'σ', '\\Sigma': 'Σ', '\\tau': 'τ',
  '\\upsilon': 'υ', '\\phi': 'φ', '\\Phi': 'Φ', '\\varphi': 'ϕ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\Psi': 'Ψ', '\\omega': 'ω', '\\Omega': 'Ω',
}
const OPERATORS: Record<string, string> = {
  '\\cdot': '·', '\\times': '×', '\\div': '÷', '\\pm': '±',
  '\\neq': '≠', '\\ne': '≠', '\\le': '≤', '\\leq': '≤',
  '\\ge': '≥', '\\geq': '≥', '\\approx': '≈', '\\equiv': '≡',
  '\\propto': '∝', '\\infty': '∞', '\\sum': '∑', '\\prod': '∏',
  '\\int': '∫', '\\partial': '∂', '\\to': '→', '\\rightarrow': '→',
  '\\leftarrow': '←', '\\leftrightarrow': '↔', '\\degree': '°',
  '\\angle': '∠', '\\forall': '∀', '\\exists': '∃', '\\in': '∈',
  '\\notin': '∉', '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅',
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function asRow(spec: MathSpec): MathSpec {
  return Array.isArray(spec) && spec[0] === 'mrow' ? spec : ['mrow', {}, spec]
}

function latexToMathMLSpec(source: string): MathSpec {
  const tokens = (source || 'x = y').match(/\\[a-zA-Z]+|\\.|[0-9]+(?:\.[0-9]+)?|[A-Za-z]+|\s+|./g) || []
  let index = 0

  const parseSequence = (stopAtBrace = false): MathSpec[] => {
    const nodes: MathSpec[] = []
    while (index < tokens.length) {
      const token = tokens[index++]
      if (token === '}' && stopAtBrace) break
      if (token === '}') continue
      if (token === '{') {
        nodes.push(['mrow', {}, ...parseSequence(true)])
        continue
      }
      if (token === '^' || token === '_') {
        const base = nodes.pop()
        if (!base) { nodes.push(['mo', {}, token]); continue }
        const script = parseGroup()
        nodes.push([token === '^' ? 'msup' : 'msub', {}, asRow(base), asRow(script)])
        continue
      }
      nodes.push(parseAtom(token))
    }
    return nodes
  }

  const parseGroup = (): MathSpec => {
    if (tokens[index] === '{') {
      index += 1
      return ['mrow', {}, ...parseSequence(true)]
    }
    if (index >= tokens.length) return ['mrow', {}, ['mtext', {}, '']]
    return parseAtom(tokens[index++])
  }

  const parseAtom = (token: string): MathSpec => {
    if (token === '\\frac') return ['mfrac', {}, asRow(parseGroup()), asRow(parseGroup())]
    if (token === '\\sqrt') return ['msqrt', {}, asRow(parseGroup())]
    if (token === '\\text' || token === '\\mathrm') return ['mtext', {}, stripMathBraces(tokens, index)]
    if (token === '\\left' || token === '\\right' || token === '\\displaystyle' || token === '\\textstyle') return ['mspace', { width: '0em' }]
    if (GREEK[token]) return ['mi', {}, GREEK[token]]
    if (OPERATORS[token]) return ['mo', {}, OPERATORS[token]]
    if (token === '\\quad' || token === '\\qquad' || token === '\\;' || token === '\\,') {
      const width = token === '\\qquad' ? '2em' : token === '\\quad' ? '1em' : token === '\\;' ? '0.28em' : '0.16em'
      return ['mspace', { width }]
    }
    if (token.trim() === '') return ['mspace', { width: Math.min(1.5, token.length * 0.28) + 'em' }]
    if (token.startsWith('\\')) return ['mi', {}, token.slice(1)]
    if (/^[0-9]/.test(token)) return ['mn', {}, token]
    if (/^[A-Za-z]+$/.test(token)) return ['mi', {}, token]
    if ('=+-*/<>|:,;!()[]'.includes(token)) return ['mo', {}, token]
    return ['mo', {}, token]
  }

  const stripMathBraces = (allTokens: string[], from: number): string => {
    if (allTokens[from] === '{') {
      const end = allTokens.indexOf('}', from + 1)
      if (end > from) {
        const text = allTokens.slice(from + 1, end).join('')
        index = end + 1
        return text.replace(/\\/g, '')
      }
    }
    return ''
  }

  const children = parseSequence()
  return ['math', { xmlns: 'http://www.w3.org/1998/Math/MathML', display: 'block' }, ['mrow', {}, ...(children.length ? children : [['mtext', {}, ''] as MathSpec])]]
}

function mathSpecToHtml(spec: MathSpec | string): string {
  if (typeof spec === 'string') return escapeHtml(spec)
  if (!Array.isArray(spec)) return ''
  const [tag, attributes, ...children] = spec
  const attrs = Object.entries(attributes || {}).map(([key, value]) => ' ' + key + '="' + escapeHtml(String(value)) + '"').join('')
  return '<' + tag + attrs + '>' + children.map((child) => mathSpecToHtml(child)).join('') + '</' + tag + '>'
}

function MathEquationView({ node, updateAttributes }: NodeViewProps) {
  const latex = String(node.attrs.latex || 'x = y')
  const offsetX = Number(node.attrs.offsetX || 0)
  const offsetY = Number(node.attrs.offsetY || 0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(latex)
  const [dragOffset, setDragOffset] = useState({ x: offsetX, y: offsetY })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  useEffect(() => {
    if (!editing) setDraft(latex)
  }, [latex, editing])

  useEffect(() => {
    if (!dragRef.current) setDragOffset({ x: offsetX, y: offsetY })
  }, [offsetX, offsetY])

  const save = () => {
    const value = draft.trim()
    if (!value) return
    updateAttributes({ latex: value })
    setEditing(false)
  }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    setDragOffset({
      x: Math.round(drag.originX + event.clientX - drag.startX),
      y: Math.round(drag.originY + event.clientY - drag.startY),
    })
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const nextX = Math.round(drag.originX + event.clientX - drag.startX)
    const nextY = Math.round(drag.originY + event.clientY - drag.startY)
    dragRef.current = null
    setDragging(false)
    setDragOffset({ x: nextX, y: nextY })
    updateAttributes({ offsetX: nextX, offsetY: nextY })
  }

  return (
    <NodeViewWrapper as="div" className="md-equation-node" contentEditable={false} data-md-equation="true" data-latex={latex}
      style={{
        display: 'block',
        position: 'relative',
        width: 'max-content',
        maxWidth: '100%',
        margin: '14px auto',
        textAlign: 'center',
        transform: 'translate(' + dragOffset.x + 'px, ' + dragOffset.y + 'px)',
        zIndex: dragging ? 30 : 1,
      }}>
      <button type="button" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag}
        onPointerCancel={finishDrag} title="Trascina per spostare l'equazione"
        aria-label="Trascina per spostare l'equazione"
        className="absolute -left-8 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-500 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        style={{ touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}>
        ⠿
      </button>
      {editing ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-left shadow-sm" style={{ width: 'min(680px, 90vw)', margin: '0 auto' }}>
          <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="md-equation-edit-source">Modifica equazione (LaTeX)</label>
          <input id="md-equation-edit-source" value={draft} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); save() }
              if (event.key === 'Escape') { event.preventDefault(); setEditing(false); setDraft(latex) }
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" autoFocus />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setDraft(latex) }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Annulla</button>
            <button type="button" onClick={save} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white">Applica</button>
          </div>
        </div>
      ) : (
        <button type="button" onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditing(true) }}
          onClick={(event) => event.stopPropagation()} title="Doppio clic per modificare l'equazione"
          aria-label={'Equazione: ' + latex + '. Doppio clic per modificarla.'}
          className="inline-flex max-w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 hover:border-indigo-200 hover:bg-indigo-50/50"
          style={{ minHeight: 42, maxWidth: '100%', fontSize: 21, color: '#172554' }}>
          <span dangerouslySetInnerHTML={{ __html: mathSpecToHtml(latexToMathMLSpec(latex)) }} />
        </button>
      )}
    </NodeViewWrapper>
  )
}

export const MathEquation = Node.create({
  name: 'mathEquation',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      latex: {
        default: 'x^2 + y^2 = z^2',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-latex') || 'x = y',
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-latex': String(attributes.latex || 'x = y') }),
      },
      offsetX: {
        default: 0,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute('data-offset-x') || 0),
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-offset-x': String(Number(attributes.offsetX) || 0) }),
      },
      offsetY: {
        default: 0,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute('data-offset-y') || 0),
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-offset-y': String(Number(attributes.offsetY) || 0) }),
      },
    }
  },
  parseHTML() {
    return [{
      tag: 'div[data-md-equation="true"]',
      getAttrs: (element) => ({ latex: (element as HTMLElement).getAttribute('data-latex') || 'x = y' }),
    }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const latex = String(node.attrs.latex || 'x = y')
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-md-equation': 'true',
        'data-latex': latex,
        class: 'md-equation-node',
        contenteditable: 'false',
        'aria-label': 'Equazione matematica',
        style: 'position:relative;display:block;width:max-content;max-width:100%;margin:14px auto;transform:translate(' +
          Number(node.attrs.offsetX || 0) + 'px,' + Number(node.attrs.offsetY || 0) + 'px)',
      }),
      latexToMathMLSpec(latex),
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathEquationView)
  },
})
