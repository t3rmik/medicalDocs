'use client'

import { useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import toast from 'react-hot-toast'
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Subscript, Superscript, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Palette, Highlighter,
  Table as TableIcon, Image as ImageIcon, SplitSquareHorizontal,
  Undo, Redo, RemoveFormatting, Rows, Columns, Trash2, FileUp, PenLine
} from 'lucide-react'
import { cn } from '@/lib/utils'

async function readCompressedImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const maxDimension = 1400;
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Il browser non riesce a preparare l’immagine.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Compressione immagine non riuscita.')), 'image/jpeg', 0.74);
    });
    if (blob.size > 600 * 1024) throw new Error('L’immagine è ancora troppo pesante: scegli una versione più piccola.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Lettura immagine non riuscita.'));
      reader.onerror = () => reject(new Error('Lettura immagine non riuscita.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface RibbonProps {
  editor: Editor | null;
  onOpenDrawingPad: () => void;
}

export function Ribbon({ editor, onOpenDrawingPad }: RibbonProps) {
  const [activeTab, setActiveTab] = useState<'Home' | 'Inserisci' | 'Tabella' | 'Layout' | 'Studio'>('Home');
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
    <div className="z-40 flex flex-col border-b border-slate-200 bg-white shadow-sm print:hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-1">
        <TabButton name="Home" />
        <TabButton name="Inserisci" />
        {editor.isActive('table') && <TabButton name="Tabella" />}
        <TabButton name="Layout" />
        <TabButton name="Studio" />
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
                <option value="Calibri">Calibri</option>
                <option value="Arial">Arial</option>
                <option value="Inter">Inter</option>
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

        {activeTab === 'Studio' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 min-w-40">
              <p className="text-xs font-semibold text-slate-800">Strumenti per studiare</p>
              <p className="text-[11px] text-slate-500">Inserisci schemi pronti e poi compila gli spazi.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent(
                  '<h2>Schema della lezione</h2><h3>Obiettivi</h3><ul><li><p>Che cosa devo imparare?</p></li></ul><h3>Concetti chiave</h3><p>Scrivi qui i concetti principali...</p><h3>Esempi e collegamenti</h3><p>Aggiungi esempi, casi e collegamenti utili...</p><h3>Riepilogo in 3 punti</h3><ol><li><p>Primo punto</p></li><li><p>Secondo punto</p></li><li><p>Terzo punto</p></li></ol>'
                ).run();
                toast.success('Schema di studio inserito.');
              }}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
            >
              Schema lezione
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent(
                  '<h2>Domande di ripasso</h2><ol><li><p>Qual è il concetto più importante?</p></li><li><p>Come lo spiegherei con parole mie?</p></li><li><p>Quale esempio posso ricordare?</p></li><li><p>Che cosa devo rivedere?</p></li></ol><h3>Risposte e dubbi</h3><p>Completa qui le risposte...</p>'
                ).run();
                toast.success('Domande di ripasso inserite.');
              }}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
            >
              Domande di ripasso
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent(
                  '<h2>Flashcard</h2><p><strong>Domanda</strong></p><p>Scrivi una domanda breve...</p><p><strong>Risposta</strong></p><p>Scrivi una risposta chiara e sintetica...</p><hr/><p><strong>Domanda successiva</strong></p><p>Scrivi qui...</p><p><strong>Risposta</strong></p><p>Scrivi qui...</p>'
                ).run();
                toast.success('Modello flashcard inserito.');
              }}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Flashcard
            </button>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent(
                  '<h2>Checklist di ripasso</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Ho letto e compreso gli appunti</p></li><li data-type="taskItem" data-checked="false"><p>So spiegare i concetti senza guardare</p></li><li data-type="taskItem" data-checked="false"><p>Ho fatto una pausa</p></li><li data-type="taskItem" data-checked="false"><p>Ho segnato i dubbi da chiarire</p></li></ul>'
                ).run();
                toast.success('Checklist di ripasso inserita.');
              }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Checklist di studio
            </button>
          </div>
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
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              aria-label="Scegli immagine dal dispositivo"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (!file) return;
                const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                  toast.error('Scegli un’immagine PNG, JPG, WEBP o GIF.');
                  return;
                }
                if (file.size > 12 * 1024 * 1024) {
                  toast.error('Scegli un’immagine originale sotto 12 MB: verrà ridimensionata automaticamente.');
                  return;
                }
                try {
                  const src = await readCompressedImage(file);
                  editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') }).run();
                  toast.success('Immagine ridimensionata e inserita nel documento.');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Non è stato possibile leggere questa immagine.');
                }
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <FileUp className="h-4 w-4 text-emerald-600" /> <span>Carica immagine</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Incolla l’indirizzo web dell’immagine:');
                if (!url) return;
                try {
                  const parsed = new URL(url);
                  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL non sicuro');
                  editor.chain().focus().setImage({ src: parsed.toString() }).run();
                } catch {
                  toast.error('Inserisci un URL immagine valido che inizi con https:// o http://.');
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <ImageIcon className="h-4 w-4 text-blue-600" /> <span>Da link</span>
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              title="Inserisce un’interruzione manuale; verrà rispettata in esportazione"
            >
              <SplitSquareHorizontal className="h-4 w-4 text-indigo-600" /> <span>Interruzione pagina</span>
            </button>
            <button
              type="button"
              onClick={onOpenDrawingPad}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
            >
              <PenLine className="h-4 w-4" /> Scrivi a mano
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Formato pagina A4 · margini standard</span>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <SplitSquareHorizontal className="h-4 w-4 text-indigo-600" /> Inserisci nuova pagina
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
