'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { ResizableImage } from './ResizableImage'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

import { Ribbon } from './Ribbon'
import { StatusBar } from './StatusBar'
import { InkLayer } from './InkLayer'
import { MathEquation } from './MathEquation'
import { MedicalDocsIcon } from '@/components/icons/MedicalDocsIcons'
import { PaginationPlus, PAGE_SIZES } from 'tiptap-pagination-plus'
import type { DocumentPageSection } from '@/types/documentPages'

const FontSizeTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const fontSize = typeof attributes.fontSize === 'string' ? attributes.fontSize : ''
          if (!fontSize || !/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/.test(fontSize)) return {}
          return { style: 'font-size: ' + fontSize }
        },
      },
      lineHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const lineHeight = typeof attributes.lineHeight === 'string' ? attributes.lineHeight : ''
          if (!['1', '1.0', '1.15', '1.5', '2'].includes(lineHeight)) return {}
          return { style: 'line-height: ' + lineHeight }
        },
      },
    }
  },
})



const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  parseHTML() {
    return [{ tag: 'div[data-page-break="true"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-page-break': 'true',
        class: 'page-break-marker',
        contenteditable: 'false',
        'aria-label': 'Interruzione di pagina',
      }),
    ]
  },
})

const StudyTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mdWidth: {
        default: 100,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute('data-md-width') || 100),
        renderHTML: (attributes: Record<string, unknown>) => {
          const rawWidth = Number(attributes.mdWidth)
          const width = Number.isFinite(rawWidth) ? Math.max(35, Math.min(100, rawWidth)) : 100
          return { 'data-md-width': String(width), style: 'width: ' + width + '%; min-width: ' + width + '%;' }
        },
      },
      mdAlign: {
        default: 'left',
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-md-align') || 'left'
          return ['left', 'center', 'right'].includes(value) ? value : 'left'
        },
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-md-align': String(attributes.mdAlign || 'left') }),
      },
      mdDensity: {
        default: 'normal',
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-md-density') || 'normal'
          return ['compact', 'normal', 'comfortable'].includes(value) ? value : 'normal'
        },
        renderHTML: (attributes: Record<string, unknown>) => ({ 'data-md-density': String(attributes.mdDensity || 'normal') }),
      },
    }
  },
})

interface EditorCoreProps {
  initialContent: string;
  onChange: (html: string) => void;
  isSaving: boolean;
  documentVersion: number;
  onRegisterInsert?: (handler: ((html: string) => void) | null) => void;
  onRegisterPageSections?: (handler: (() => DocumentPageSection[]) | null) => void;
}

export default function EditorCore({ initialContent, onChange, isSaving, documentVersion, onRegisterInsert, onRegisterPageSections }: EditorCoreProps) {
  const lastDocumentVersionRef = useRef(documentVersion)
  const initialContentRef = useRef(initialContent)
  initialContentRef.current = initialContent
  const [zoom, setZoom] = useState(100)
  const [fitScale, setFitScale] = useState(1)
  const editorViewportRef = useRef<HTMLDivElement | null>(null)
  const [inkMode, setInkMode] = useState(false)
  const [inkColor, setInkColor] = useState('#154e73')
  const [inkBrushSize, setInkBrushSize] = useState(2.4)
  const [inkInputMode, setInkInputMode] = useState<'pen' | 'finger'>('pen')
  const [inkTool, setInkTool] = useState<'pen' | 'highlighter' | 'eraser' | 'select'>('pen')
  const [eraserMode, setEraserMode] = useState<'stroke' | 'precision'>('stroke')
  const [eraserSize, setEraserSize] = useState(24)
  const [inkToolbarCollapsed, setInkToolbarCollapsed] = useState(false)



  useEffect(() => {
    if (!inkMode) return
    const collapseToolbarForWriting = () => {
      const isTouchTablet = window.matchMedia('(min-width: 768px) and (max-width: 1440px) and (any-pointer: coarse)').matches
      if (isTouchTablet) setInkToolbarCollapsed(true)
    }
    window.addEventListener('medicaldocs:ink-gesture-start', collapseToolbarForWriting)
    return () => window.removeEventListener('medicaldocs:ink-gesture-start', collapseToolbarForWriting)
  }, [inkMode])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      FontSizeTextStyle, Color, FontFamily, Underline, Subscript, Superscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      StudyTable.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      ResizableImage,
      PageBreak,
      InkLayer,
      MathEquation,
      PaginationPlus.configure({
        ...PAGE_SIZES.A4,
        enabled: true,
        marginTop: 24,
        marginBottom: 36,
        marginLeft: 96,
        marginRight: 96,
        pageGap: 30,
        pageGapBorderSize: 1,
        pageGapBorderColor: '#d7e0ed',
        pageBreakBackground: '#e9eef7',
        contentMarginTop: 0,
        contentMarginBottom: 0,
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: 'Pagina {page}',
      }),
      Link.configure({ openOnClick: false }),
      TaskList, TaskItem.configure({ nested: true }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'editor-page prose prose-slate max-w-none focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return false

        const $from = view.state.selection.$from
        let insideTable = false
        let insideList = false
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const name = $from.node(depth).type.name
          if (name === 'table' || name === 'tableCell' || name === 'tableHeader' || name === 'tableRow') insideTable = true
          if (name === 'listItem' || name === 'taskItem' || name === 'bulletList' || name === 'orderedList' || name === 'taskList') insideList = true
        }

        // Keep native ProseMirror/Tiptap behaviours for table navigation and list indentation.
        if (insideTable || insideList) return false

        event.preventDefault()
        view.dispatch(view.state.tr.insertText('\t'))
        return true
      },
    },
  });

  useEffect(() => {
    if (!editor) return
    const viewport = editorViewportRef.current
    if (!viewport) return

    const updateFitScale = () => {
      const computedStyle = window.getComputedStyle(editor.view.dom)
      const rawWidth = computedStyle.getPropertyValue('--md-page-width').trim() || '210mm'
      const match = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)(mm|cm|in|px)?$/)
      if (!match) {
        setFitScale(1)
        return
      }
      const amount = Number(match[1])
      const unit = match[2] || 'px'
      const pageWidthPx = unit === 'mm' ? amount * 96 / 25.4
        : unit === 'cm' ? amount * 96 / 2.54
        : unit === 'in' ? amount * 96
        : amount
      const usableWidth = Math.max(260, viewport.clientWidth - 20)
      const next = Math.max(0.72, Math.min(1, usableWidth / Math.max(1, pageWidthPx)))
      setFitScale((current) => Math.abs(current - next) < 0.005 ? current : next)
    }

    updateFitScale()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateFitScale) : null
    observer?.observe(viewport)
    observer?.observe(editor.view.dom)
    window.addEventListener('resize', updateFitScale)
    window.addEventListener('orientationchange', updateFitScale)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateFitScale)
      window.removeEventListener('orientationchange', updateFitScale)
    }
  }, [editor])

  const getActualPageSections = useCallback((): DocumentPageSection[] => {
    if (!editor || typeof window === 'undefined') return []

    const root = editor.view.dom
    const topLevelNodes: Array<{ node: any; pos: number; element: HTMLElement | null }> = []
    editor.state.doc.forEach((node, pos) => {
      const domNode = editor.view.nodeDOM(pos)
      const element = domNode instanceof HTMLElement
        ? domNode
        : domNode instanceof Text
          ? domNode.parentElement
          : null
      topLevelNodes.push({ node, pos, element })
    })
    const visibleBlocks = topLevelNodes.filter(({ node, element }) =>
      node.type.name !== 'pageBreak' && element && node.type.name !== 'inkLayer'
    )
    if (visibleBlocks.length === 0) return []

    const blockRects = visibleBlocks.map(({ element }) => element!.getBoundingClientRect())
      .filter((rect) => rect.height > 0 || rect.width > 0)
    if (blockRects.length === 0) return []
    const firstTop = Math.min(...blockRects.map((rect) => rect.top))
    const lastBottom = Math.max(...blockRects.map((rect) => rect.bottom))
    const gapCenters = Array.from(root.querySelectorAll<HTMLElement>('.rm-pagination-gap'))
      .map((gap) => {
        const rect = gap.getBoundingClientRect()
        return rect.top + rect.height / 2
      })
      .filter((center) => Number.isFinite(center) && center > firstTop + 1 && center < lastBottom - 1)
      .sort((a, b) => a - b)
    const uniqueBoundaries = gapCenters.filter((center, index) =>
      index === 0 || Math.abs(center - gapCenters[index - 1]) > 3
    )

    const groups = new Map<number, string[]>()
    let previousAutoPage = 1
    let pageOffset = 0
    let pendingManualBreaks = 0
    for (const { node, element } of topLevelNodes) {
      if (node.type.name === 'pageBreak') {
        pendingManualBreaks += 1
        continue
      }
      if (node.type.name === 'inkLayer') continue

      const rect = element?.getBoundingClientRect()
      const autoPage = rect ? 1 + uniqueBoundaries.filter((center) => center < rect.top + 1).length : previousAutoPage
      if (pendingManualBreaks > 0) {
        const naturalAdvance = Math.max(0, autoPage - previousAutoPage)
        pageOffset += Math.max(0, pendingManualBreaks - naturalAdvance)
        pendingManualBreaks = 0
      }
      const pageNumber = autoPage + pageOffset
      previousAutoPage = autoPage

      let text = ''
      if (node.type.name === 'table') {
        const rows: string[] = []
        node.forEach((row: any) => {
          const cells: string[] = []
          row.forEach((cell: any) => {
            cells.push(cell.textBetween(0, cell.content.size, ' ', ' ').replace(/\s+/g, ' ').trim())
          })
          if (cells.some(Boolean)) rows.push(cells.join(' | '))
        })
        text = rows.join('\n')
      } else if (node.type.name === 'image' || node.type.name === 'resizableImage') {
        text = String(node.attrs.alt || node.attrs.title || 'Immagine')
      } else {
        text = node.textBetween(0, node.content.size, '\n', '\n').trim() || String(node.textContent || '').trim()
      }
      if (!text) continue
      const existing = groups.get(pageNumber) || []
      existing.push(text)
      groups.set(pageNumber, existing)
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left - right)
      .map(([number, parts]) => ({
        number,
        title: 'Pagina ' + number,
        text: 'Pagina ' + number + '\n' + parts.join('\n\n'),
      }))
  }, [editor])

  useEffect(() => {
    if (!onRegisterPageSections) return
    onRegisterPageSections(getActualPageSections)
    return () => onRegisterPageSections(null)
  }, [getActualPageSections, onRegisterPageSections])

  // Reuse the ProseMirror instance when changing notes instead of rebuilding all extensions.
  // emitUpdate=false is important: loading an existing note must not schedule a save as a new edit.
  useEffect(() => {
    if (!editor || lastDocumentVersionRef.current === documentVersion) return
    lastDocumentVersionRef.current = documentVersion
    editor.commands.setContent(initialContentRef.current, false)
    setZoom(100)
    setInkMode(false)
    setInkToolbarCollapsed(false)
    setInkTool('pen')
    setInkInputMode('pen')
  }, [editor, documentVersion])

  const findInkLayer = useCallback(() => {
    if (!editor) return null;
    const doc = editor.state.doc;
    let pos = 0;
    while (pos < doc.content.size) {
      const node = doc.nodeAt(pos);
      if (!node) break;
      if (node.type.name === 'medicalInkLayer') return { pos, node };
      pos += node.nodeSize;
    }
    return null;
  }, [editor]);

  const updateInkLayer = useCallback((patch: Record<string, unknown>) => {
    if (!editor) return;
    const existing = findInkLayer();
    if (!existing) {
      const root = editor.view.dom as HTMLElement;
      editor.chain().insertContentAt(0, {
        type: 'medicalInkLayer',
        attrs: {
          paths: [], width: Math.max(1, root.clientWidth || 800),
          height: Math.max(root.scrollHeight, root.clientHeight, 1122),
          enabled: Boolean(patch.enabled), color: inkColor,
          brushSize: inkBrushSize, inputMode: inkInputMode, tool: inkTool, eraserMode, eraserSize, undoStack: [], redoStack: [], selectedId: null, ...patch,
        },
      }).run();
      return;
    }
    editor.view.dispatch(editor.state.tr.setNodeMarkup(existing.pos, undefined, { ...existing.node.attrs, ...patch }));
  }, [editor, findInkLayer, inkColor, inkBrushSize, inkInputMode, eraserMode, eraserSize]);

  const toggleInkMode = useCallback(() => {
    const next = !inkMode;
    updateInkLayer({ enabled: next, color: inkColor, brushSize: inkBrushSize, inputMode: inkInputMode, tool: inkTool, eraserMode, eraserSize });
    setInkMode(next);
    setInkToolbarCollapsed(false);
  }, [inkMode, updateInkLayer, inkColor, inkBrushSize, inkInputMode, inkTool, eraserMode, eraserSize]);

  const chooseInkTool = (tool: 'pen' | 'highlighter' | 'eraser' | 'select') => {
    setInkTool(tool);
    setInkMode(true);
    updateInkLayer({ enabled: true, tool, color: inkColor, brushSize: inkBrushSize, inputMode: inkInputMode, eraserMode, eraserSize });
  };

  const changeInkColor = (value: string) => { setInkColor(value); updateInkLayer({ color: value }); };
  const changeInkBrushSize = (value: number) => { setInkBrushSize(value); updateInkLayer({ brushSize: value }); };
  const changeEraserMode = (value: 'stroke' | 'precision') => { setEraserMode(value); updateInkLayer({ eraserMode: value }); };
  const changeEraserSize = (value: number) => { setEraserSize(value); updateInkLayer({ eraserSize: value }); };
  const changeInkInputMode = (value: 'pen' | 'finger') => { setInkInputMode(value); updateInkLayer({ inputMode: value }); };
  const undoInkStroke = () => {
    const existing = findInkLayer();
    if (!existing) return;
    const history = Array.isArray(existing.node.attrs.undoStack) ? existing.node.attrs.undoStack : [];
    const redo = Array.isArray(existing.node.attrs.redoStack) ? existing.node.attrs.redoStack : [];
    const current = Array.isArray(existing.node.attrs.paths) ? existing.node.attrs.paths : [];
    if (!history.length) return;
    updateInkLayer({ paths: history[history.length - 1], undoStack: history.slice(0, -1), redoStack: [...redo, current].slice(-60), selectedId: null });
  };
  const redoInkStroke = () => {
    const existing = findInkLayer();
    if (!existing) return;
    const history = Array.isArray(existing.node.attrs.undoStack) ? existing.node.attrs.undoStack : [];
    const redo = Array.isArray(existing.node.attrs.redoStack) ? existing.node.attrs.redoStack : [];
    const current = Array.isArray(existing.node.attrs.paths) ? existing.node.attrs.paths : [];
    if (!redo.length) return;
    updateInkLayer({ paths: redo[redo.length - 1], undoStack: [...history, current].slice(-60), redoStack: redo.slice(0, -1), selectedId: null });
  };
  const clearInkStrokes = () => {
    const existing = findInkLayer();
    if (!existing || !Array.isArray(existing.node.attrs.paths) || !existing.node.attrs.paths.length) return;
    if (!window.confirm('Cancellare tutti i tratti a mano libera di questo documento?')) return;
    const history = Array.isArray(existing.node.attrs.undoStack) ? existing.node.attrs.undoStack : [];
    updateInkLayer({ paths: [], undoStack: [...history, existing.node.attrs.paths].slice(-60), redoStack: [], selectedId: null });
  };
  const inkState = findInkLayer()?.node.attrs;
  const canUndoInk = Boolean(inkState && Array.isArray(inkState.undoStack) && inkState.undoStack.length);
  const canRedoInk = Boolean(inkState && Array.isArray(inkState.redoStack) && inkState.redoStack.length);

  useEffect(() => {
    if (!editor || !onRegisterInsert) return;
    const insertHtml = (html: string) => {
      editor.chain().focus().insertContent(html).run();
    };
    onRegisterInsert(insertHtml);
    return () => onRegisterInsert(null);
  }, [editor, onRegisterInsert]);

  return (
    <div data-md-editor-shell="true" className="flex h-full w-full flex-col bg-gradient-to-br from-slate-100 via-teal-50 to-[#e5eff2]">
      <Ribbon editor={editor} onToggleInk={toggleInkMode} inkMode={inkMode} />
      {inkMode && (
        <div data-md-ink-toolbar="true" data-md-ink-collapsed={inkToolbarCollapsed ? 'true' : 'false'} className="z-40 flex flex-wrap items-center gap-2 border-b border-indigo-200 bg-white px-3 py-2 shadow-sm sm:px-4">
          {inkToolbarCollapsed ? (
            <button type="button" className="md-ink-toolbar-mini" onClick={() => setInkToolbarCollapsed(false)} aria-label="Riapri gli strumenti della penna" title="Riapri gli strumenti della penna">
              {inkTool === 'highlighter' ? <MedicalDocsIcon name="highlighter" size={20} /> : inkTool === 'eraser' ? <MedicalDocsIcon name="eraser" size={20} /> : inkTool === 'select' ? <MedicalDocsIcon name="select" size={20} /> : <MedicalDocsIcon name="pen" size={20} />}
              <span className="md-ink-toolbar-mini-color" style={{ backgroundColor: inkColor }} aria-hidden="true" />
            </button>
          ) : (
            <>
          <span className="mr-1 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />Penna attiva</span>
          <button type="button" className="md-ink-toolbar-collapse" onClick={() => setInkToolbarCollapsed(true)} aria-label="Riduci gli strumenti della penna" title="Riduci gli strumenti della penna"><span aria-hidden="true">−</span><span className="sr-only">Riduci gli strumenti</span></button>
          <div className="md-ink-tool-selector flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" data-md-ink-tools="true" role="group" aria-label="Strumento di scrittura">
            <button type="button" onClick={() => chooseInkTool('pen')} aria-pressed={inkTool === 'pen'} className={"flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold " + (inkTool === 'pen' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-700 hover:bg-white')}><MedicalDocsIcon name="pen" size={16} /> <span>Penna</span></button>
            <button type="button" onClick={() => chooseInkTool('highlighter')} aria-pressed={inkTool === 'highlighter'} className={"flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold " + (inkTool === 'highlighter' ? 'bg-amber-200 text-amber-950 shadow-sm' : 'text-slate-700 hover:bg-white')}><MedicalDocsIcon name="highlighter" size={16} /> <span>Evidenzia</span></button>
            <button type="button" onClick={() => chooseInkTool('eraser')} aria-pressed={inkTool === 'eraser'} className={"flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold " + (inkTool === 'eraser' ? 'bg-rose-100 text-rose-800 shadow-sm' : 'text-slate-700 hover:bg-white')}><MedicalDocsIcon name="eraser" size={16} /> <span>Gomma</span></button>
            <button type="button" onClick={() => chooseInkTool('select')} aria-pressed={inkTool === 'select'} className={"flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold " + (inkTool === 'select' ? 'bg-indigo-100 text-indigo-900 shadow-sm' : 'text-slate-700 hover:bg-white')}><MedicalDocsIcon name="select" size={16} /> <span>Seleziona</span></button>
          </div>
          {inkTool === 'eraser' ? (
            <>
              <div data-md-eraser-modes="true" role="group" aria-label="Modalità gomma" className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 p-1">
                <button type="button" onClick={() => changeEraserMode('stroke')} aria-pressed={eraserMode === 'stroke'} title="Rimuove tutto il tratto continuo toccato" className={"min-h-10 rounded-lg px-2.5 py-2 text-xs font-semibold " + (eraserMode === 'stroke' ? 'bg-rose-700 text-white shadow-sm' : 'text-rose-900 hover:bg-white')}>Tratto intero</button>
                <button type="button" onClick={() => changeEraserMode('precision')} aria-pressed={eraserMode === 'precision'} title="Rimuove solo la zona sotto la punta della gomma" className={"min-h-10 rounded-lg px-2.5 py-2 text-xs font-semibold " + (eraserMode === 'precision' ? 'bg-rose-700 text-white shadow-sm' : 'text-rose-900 hover:bg-white')}>Precisione</button>
              </div>
              <label className="flex min-h-10 min-w-40 flex-1 items-center gap-2 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 sm:max-w-64">Spessore gomma
                <input type="range" min="8" max="48" step="2" value={eraserSize} onChange={(event) => changeEraserSize(Number(event.target.value))} className="min-w-0 flex-1 accent-rose-600" aria-label="Spessore della gomma" />
                <span className="w-7 text-right tabular-nums">{eraserSize}</span>
              </label>
            </>
          ) : (
            <>
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5" role="group" aria-label="Colori rapidi">
            {[
              { color: '#154e73', label: 'Blu petrolio' }, { color: '#1d4ed8', label: 'Blu' },
              { color: '#111827', label: 'Nero' }, { color: '#dc2626', label: 'Rosso' },
              { color: '#16a34a', label: 'Verde' }, { color: '#facc15', label: 'Giallo' }
            ].map((swatch) => (
              <button key={swatch.color} type="button" title={swatch.label} aria-label={swatch.label} aria-pressed={inkColor === swatch.color}
                onClick={() => changeInkColor(swatch.color)}
                className={"h-7 w-7 rounded-full border-2 " + (inkColor === swatch.color ? 'border-indigo-700 ring-2 ring-indigo-100' : 'border-white shadow-sm')}
                style={{ backgroundColor: swatch.color }} />
            ))}
            <input type="color" value={inkColor} onChange={(event) => changeInkColor(event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-slate-200 bg-white p-0.5" aria-label="Colore personalizzato" />
          </div>
          <label className="flex min-h-10 min-w-32 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 sm:max-w-48">Spessore
            <input type="range" min="1" max="8" step="0.2" value={inkBrushSize} onChange={(event) => changeInkBrushSize(Number(event.target.value))} className="min-w-0 flex-1 accent-indigo-600" aria-label="Spessore della penna" />
            <span className="w-7 text-right tabular-nums">{inkBrushSize.toFixed(1)}</span>
          </label>
            </>
          )}
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={inkInputMode === 'finger'} onChange={(event) => changeInkInputMode(event.target.checked ? 'finger' : 'pen')} className="h-4 w-4 accent-indigo-600" /> Disegna col dito
          </label>
          <span className="text-[11px] font-medium text-indigo-700">{inkInputMode === 'pen' ? 'Stilo: scrive · dito: scorre e zooma' : 'Dito: disegna · pizzica con due dita per zoomare'}</span>
          <button type="button" onClick={undoInkStroke} disabled={!canUndoInk} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" title="Annulla ultima azione">↶</button>
          <button type="button" onClick={redoInkStroke} disabled={!canRedoInk} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" title="Ripeti azione">↷</button>
          <button type="button" onClick={clearInkStrokes} className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Cancella tutto</button>
          <button type="button" onClick={toggleInkMode} className="min-h-10 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800">Fine</button>
            </>
          )}
        </div>
      )}
      {inkMode && inkToolbarCollapsed && (
        <div data-md-ink-quick-history="true" role="group" aria-label="Cronologia dei tratti" className="md-ink-quick-history">
          <button type="button" onClick={undoInkStroke} disabled={!canUndoInk} aria-label="Annulla ultimo tratto" title="Annulla ultimo tratto" className="md-ink-history-button">
            <MedicalDocsIcon name="undo" size={20} />
          </button>
          <button type="button" onClick={redoInkStroke} disabled={!canRedoInk} aria-label="Ripeti tratto annullato" title="Ripeti tratto annullato" className="md-ink-history-button">
            <MedicalDocsIcon name="redo" size={20} />
          </button>
        </div>
      )}
      <div ref={editorViewportRef} data-md-editor-viewport="true" className="min-h-0 flex-1 overflow-auto">
        <div data-md-editor-zoom-wrapper="true" style={{ zoom: (zoom / 100) * fitScale }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <StatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} isSaving={isSaving} />

    </div>
  );
}
