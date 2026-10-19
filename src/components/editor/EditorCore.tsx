'use client'

import { useState } from 'react'
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
import { DrawingPad } from './DrawingPad'
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
}

export default function EditorCore({ initialContent, onChange, isSaving }: EditorCoreProps) {
  const [zoom, setZoom] = useState(100)
  const [drawingPadOpen, setDrawingPadOpen] = useState(false)
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
      PaginationPlus.configure({
        ...PAGE_SIZES.A4,
        enabled: true,
        marginTop: 96,
        marginBottom: 96,
        marginLeft: 96,
        marginRight: 96,
        pageGap: 30,
        pageGapBorderSize: 1,
        pageGapBorderColor: '#d7e0ed',
        pageBreakBackground: '#e9eef7',
        contentMarginTop: 16,
        contentMarginBottom: 16,
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

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-br from-slate-100 via-teal-50 to-[#e5eff2]">
      <Ribbon editor={editor} onOpenDrawingPad={() => setDrawingPadOpen(true)} />
      
      <div className="min-h-0 flex-1 overflow-auto">
        <div style={{ zoom: zoom / 100 }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <StatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} isSaving={isSaving} />
      {drawingPadOpen && (
        <DrawingPad
          onClose={() => setDrawingPadOpen(false)}
          onInsert={(src) => editor?.chain().focus().setImage({ src, alt: 'Disegno a mano libera' }).run()}
        />
      )}
    </div>
  );
}
