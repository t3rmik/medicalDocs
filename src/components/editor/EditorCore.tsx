'use client'

import { useCallback, useEffect, useState } from 'react'
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
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

import { Ribbon } from './Ribbon'
import { StatusBar } from './StatusBar'
import { InkLayer } from './InkLayer'
import { PaginationPlus, PAGE_SIZES } from 'tiptap-pagination-plus'


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

interface EditorCoreProps {
  initialContent: string;
  onChange: (html: string) => void;
  isSaving: boolean;
  onRegisterInsert?: (handler: ((html: string) => void) | null) => void;
}

export default function EditorCore({ initialContent, onChange, isSaving, onRegisterInsert }: EditorCoreProps) {
  const [zoom, setZoom] = useState(100)
  const [inkMode, setInkMode] = useState(false)
  const [inkColor, setInkColor] = useState('#154e73')
  const [inkBrushSize, setInkBrushSize] = useState(2.4)
  const [inkInputMode, setInkInputMode] = useState<'pen' | 'finger'>('pen')
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle, Color, FontFamily, Underline, Subscript, Superscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Image.configure({ allowBase64: true, HTMLAttributes: { class: 'editor-image' } }),
      PageBreak,
      InkLayer,
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
    },
  });

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
          brushSize: inkBrushSize, inputMode: inkInputMode, ...patch,
        },
      }).run();
      return;
    }
    editor.view.dispatch(editor.state.tr.setNodeMarkup(existing.pos, undefined, { ...existing.node.attrs, ...patch }));
  }, [editor, findInkLayer, inkColor, inkBrushSize, inkInputMode]);

  const toggleInkMode = useCallback(() => {
    const next = !inkMode;
    updateInkLayer({ enabled: next, color: inkColor, brushSize: inkBrushSize, inputMode: inkInputMode });
    setInkMode(next);
  }, [inkMode, updateInkLayer, inkColor, inkBrushSize, inkInputMode]);

  const changeInkColor = (value: string) => { setInkColor(value); updateInkLayer({ color: value }); };
  const changeInkBrushSize = (value: number) => { setInkBrushSize(value); updateInkLayer({ brushSize: value }); };
  const changeInkInputMode = (value: 'pen' | 'finger') => { setInkInputMode(value); updateInkLayer({ inputMode: value }); };
  const undoInkStroke = () => {
    const existing = findInkLayer();
    if (existing && Array.isArray(existing.node.attrs.paths)) updateInkLayer({ paths: existing.node.attrs.paths.slice(0, -1) });
  };
  const clearInkStrokes = () => updateInkLayer({ paths: [] });

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
      
      <div className="min-h-0 flex-1 overflow-auto">
        <div style={{ zoom: zoom / 100 }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <StatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} isSaving={isSaving} />
      {inkMode && (
        <div data-md-ink-toolbar="true" className="z-40 flex flex-wrap items-center gap-3 border-b border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm shadow-sm sm:px-4">
          <span className="inline-flex items-center gap-2 font-semibold text-indigo-900"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />Penna attiva — scrivi direttamente sul foglio</span>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">Colore
            <input type="color" value={inkColor} onChange={(event) => changeInkColor(event.target.value)} className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" aria-label="Colore della penna" />
          </label>
          <label className="flex min-h-10 min-w-36 flex-1 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 sm:max-w-52">Spessore
            <input type="range" min="1" max="8" step="0.2" value={inkBrushSize} onChange={(event) => changeInkBrushSize(Number(event.target.value))} className="min-w-0 flex-1 accent-indigo-600" aria-label="Spessore della penna" />
            <span className="w-7 text-right tabular-nums">{inkBrushSize.toFixed(1)}</span>
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={inkInputMode === 'finger'} onChange={(event) => changeInkInputMode(event.target.checked ? 'finger' : 'pen')} className="h-4 w-4 accent-indigo-600" />Consenti dito
          </label>
          <button type="button" onClick={undoInkStroke} className="min-h-10 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100">Annulla tratto</button>
          <button type="button" onClick={clearInkStrokes} className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Cancella inchiostro</button>
          <button type="button" onClick={toggleInkMode} className="min-h-10 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800">Fine</button>
        </div>
      )}
    </div>
  );
}
