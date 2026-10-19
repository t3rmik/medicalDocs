'use client'

import { useState } from 'react'
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

interface EditorCoreProps {
  initialContent: string;
  onChange: (html: string) => void;
  isSaving: boolean;
}

export default function EditorCore({ initialContent, onChange, isSaving }: EditorCoreProps) {
  const [zoom, setZoom] = useState(100)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle, Color, FontFamily, Underline, Subscript, Superscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Image,
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
    <div className="flex h-full w-full flex-col bg-slate-100">
      <Ribbon editor={editor} />
      
      <div className="min-h-0 flex-1 overflow-auto">
        <div style={{ zoom: zoom / 100 }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <StatusBar editor={editor} zoom={zoom} onZoomChange={setZoom} isSaving={isSaving} />
    </div>
  );
}
