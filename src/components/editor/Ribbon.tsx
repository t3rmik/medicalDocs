'use client'

import { useState } from 'react'
import { Editor } from '@tiptap/react'
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Subscript, Superscript, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Palette, Highlighter,
  Table as TableIcon, Image as ImageIcon, SplitSquareHorizontal,
  Undo, Redo, RemoveFormatting, Rows, Columns, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RibbonProps {
  editor: Editor | null;
}

export function Ribbon({ editor }: RibbonProps) {
  const [activeTab, setActiveTab] = useState<'Home' | 'Inserisci' | 'Tabella' | 'Layout'>('Home');

  if (!editor) return null;

  const TabButton = ({ name }: { name: typeof activeTab }) => (
    <button 
      type="button"
      onClick={() => setActiveTab(name)}
      className={cn(
        "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
        activeTab === name 
          ? "border-blue-600 bg-blue-50/70 text-blue-700" 
          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {name}
    </button>
  );

  const IconButton = ({ onClick, isActive = false, disabled = false, icon: Icon, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded-lg p-2 flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600",
        isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="z-40 flex flex-col border-b border-slate-200 bg-white shadow-sm">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-1">
        <TabButton name="Home" />
        <TabButton name="Inserisci" />
        {editor.isActive('table') && <TabButton name="Tabella" />}
        <TabButton name="Layout" />
      </div>

      <div className="flex min-h-[54px] flex-wrap items-center gap-3 overflow-x-auto p-2.5">
        {activeTab === 'Home' && (
          <>
            <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
              <IconButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annulla" />
              <IconButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ripristina" />
              <IconButton icon={RemoveFormatting} onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Cancella formattazione" />
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
              <select 
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50 outline-none w-28"
                onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>
              
              <div className="flex items-center ml-1 bg-white border border-slate-300 rounded p-0.5">
                <IconButton icon={Bold} isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Grassetto" />
                <IconButton icon={Italic} isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Corsivo" />
                <IconButton icon={UnderlineIcon} isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sottolineato" />
                <IconButton icon={Strikethrough} isActive={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barrato" />
                <IconButton icon={Subscript} isActive={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Pedice" />
                <IconButton icon={Superscript} isActive={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Apice" />
              </div>

              <div className="flex items-center space-x-1 ml-1">
                <label className="p-1.5 hover:bg-slate-200 rounded cursor-pointer flex items-center text-slate-700" title="Colore Testo">
                  <Palette className="w-4 h-4 text-blue-600" />
                  <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
                </label>
                <label className="p-1.5 hover:bg-slate-200 rounded cursor-pointer flex items-center text-slate-700" title="Evidenziatore">
                  <Highlighter className="w-4 h-4 text-yellow-600" />
                  <input type="color" className="sr-only" onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()} />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
              <div className="flex items-center bg-white border border-slate-300 rounded p-0.5 mr-1">
                <IconButton icon={AlignLeft} isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Sinistra" />
                <IconButton icon={AlignCenter} isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centro" />
                <IconButton icon={AlignRight} isActive={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Destra" />
                <IconButton icon={AlignJustify} isActive={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Giustificato" />
              </div>
              <div className="flex items-center bg-white border border-slate-300 rounded p-0.5">
                <IconButton icon={List} isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Elenco puntato" />
                <IconButton icon={ListOrdered} isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Elenco numerato" />
                <IconButton icon={CheckSquare} isActive={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'Inserisci' && (
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-200 rounded text-slate-700 text-xs font-medium bg-white border border-slate-300"
            >
              <TableIcon className="w-4 h-4 text-blue-600" /> <span>Inserisci Tabella</span>
            </button>
            <button 
              type="button"
              onClick={() => {
                const url = window.prompt('URL Immagine:');
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-200 rounded text-slate-700 text-xs font-medium bg-white border border-slate-300"
            >
              <ImageIcon className="w-4 h-4 text-green-600" /> <span>Inserisci Immagine</span>
            </button>
            <button 
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-200 rounded text-slate-700 text-xs font-medium bg-white border border-slate-300"
            >
              <SplitSquareHorizontal className="w-4 h-4 text-slate-600" /> <span>Linea orizzontale</span>
            </button>
          </div>
        )}

        {activeTab === 'Tabella' && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 bg-white border rounded text-xs hover:bg-slate-100 flex items-center space-x-1">
              <Rows className="w-3.5 h-3.5 text-blue-600" /> <span>+ Riga</span>
            </button>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 bg-white border rounded text-xs hover:bg-slate-100 flex items-center space-x-1">
              <Columns className="w-3.5 h-3.5 text-blue-600" /> <span>+ Colonna</span>
            </button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 bg-white border rounded text-xs hover:bg-slate-100 text-red-600">
              Elimina Riga
            </button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 bg-white border rounded text-xs hover:bg-slate-100 text-red-600">
              Elimina Colonna
            </button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded text-xs hover:bg-red-100 flex items-center space-x-1">
              <Trash2 className="w-3.5 h-3.5" /> <span>Elimina Tabella</span>
            </button>
          </div>
        )}

        {activeTab === 'Layout' && (
          <div className="text-xs text-slate-500 italic px-2">
            Margini A4 Standard (2.54 cm). Orientamento Verticale.
          </div>
        )}
      </div>
    </div>
  );
}
