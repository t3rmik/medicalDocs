'use client'

import { useEffect, useRef, useState } from 'react'
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

type PageFormat = 'A4' | 'A5' | 'A3' | 'Letter';
type PageOrientation = 'portrait' | 'landscape';
type PageMargins = 'normal' | 'narrow' | 'wide' | 'custom';
type PageMarginSide = 'top' | 'right' | 'bottom' | 'left';
type PageMarginValues = Record<PageMarginSide, number>;
type EditorTemplate = { id: string; name: string; category: string; content: string; custom?: boolean };
const PAGE_LAYOUT_KEY = 'medicaldocs.pageLayout.v2';
const LEGACY_PAGE_LAYOUT_KEY = 'medicaldocs.pageLayout.v1';
const CUSTOM_TEMPLATE_KEY = 'medicaldocs.customTemplates.v1';
const PAGE_DIMENSIONS: Record<PageFormat, { width: number; height: number }> = { A4: { width: 210, height: 297 }, A5: { width: 148, height: 210 }, A3: { width: 297, height: 420 }, Letter: { width: 216, height: 279 } };
const PAGE_MARGIN_MM: Record<Exclude<PageMargins, 'custom'>, number> = { normal: 12, narrow: 3, wide: 25.4 };
const DEFAULT_CUSTOM_MARGINS: PageMarginValues = { top: 4, right: 4, bottom: 4, left: 4 };
const clampMargin = (value: unknown, fallback = 4) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(Math.min(40, Math.max(0, parsed)) * 10) / 10 : fallback;
};
const BUILTIN_TEMPLATES: EditorTemplate[] = [
 { id: 'nursing-notes', name: 'Appunti di lezione', category: 'Infermieristica', content: '<h1>Appunti di lezione</h1><p><strong>Insegnamento:</strong> …</p><p><strong>Argomento:</strong> …</p><h2>Obiettivi</h2><ul><li><p>…</p></li></ul><h2>Concetti chiave</h2><p>…</p><h2>Terminologia</h2><p>…</p><h2>Dubbi da chiarire</h2><p>…</p>' },
 { id: 'nursing-procedure', name: 'Procedura infermieristica', category: 'Infermieristica · didattica', content: '<h1>Scheda didattica di procedura</h1><p><em>Verificare protocolli ufficiali e indicazioni dei docenti.</em></p><h2>Obiettivo e razionale</h2><p>…</p><h2>Materiali</h2><ul><li><p>…</p></li></ul><h2>Fasi e controlli</h2><ol><li><p>…</p></li></ol><h2>Sicurezza</h2><p>…</p><h2>Domande di ripasso</h2><p>…</p>' },
 { id: 'simulated-case', name: 'Caso clinico simulato', category: 'Esercitazione', content: '<h1>Caso clinico simulato</h1><p><em>Scenario inventato per lo studio; non usare dati identificativi reali.</em></p><h2>Scenario</h2><p>…</p><h2>Dati del caso</h2><ul><li><p>…</p></li></ul><h2>Problemi da riconoscere</h2><p>…</p><h2>Priorità e motivazioni</h2><ol><li><p>…</p></li></ol>' },
 { id: 'study-sheet', name: 'Scheda di ripasso', category: 'Università', content: '<h1>Scheda di studio</h1><p><strong>Esame:</strong> …</p><p><strong>Argomento:</strong> …</p><h2>Definizione</h2><p>…</p><h2>Concetti chiave</h2><ul><li><p>…</p></li></ul><h2>Passaggi</h2><ol><li><p>…</p></li></ol><h2>Errori da evitare</h2><p>…</p><h2>Domande per ripassare</h2><p>…</p>' },
 { id: 'admission-plan', name: 'Piano accesso a Medicina', category: 'Test Medicina', content: '<h1>Piano di preparazione</h1><p><strong>Settimana:</strong> …</p><p><strong>Argomenti:</strong> …</p><h2>Studio della teoria</h2><ul><li><p>…</p></li></ul><h2>Quiz e simulazioni</h2><p>Materia: … · Numero domande: …</p><h2>Errori da correggere</h2><ul><li><p>…</p></li></ul><h2>Ripasso</h2><p>…</p>' },
 { id: 'quiz-errors', name: 'Registro errori quiz', category: 'Test Medicina', content: '<h1>Registro errori quiz</h1><p><strong>Materia:</strong> …</p><h2>Domanda o concetto</h2><p>…</p><h2>Risposta scelta</h2><p>…</p><h2>Ragionamento corretto</h2><p>…</p><h2>Perché ho sbagliato?</h2><ul><li><p>Conoscenza mancante</p></li><li><p>Lettura frettolosa</p></li><li><p>Calcolo</p></li></ul><h2>Regola da ricordare</h2><p>…</p>' },
 { id: 'flashcards', name: 'Flashcard domanda/risposta', category: 'Ripasso', content: '<h1>Flashcard</h1><h2>Domanda</h2><p>…</p><h2>Risposta</h2><p>…</p><hr/><h2>Domanda successiva</h2><p>…</p><h2>Risposta</h2><p>…</p>' },
 { id: 'formal-letter', name: 'Lettera formale', category: 'Corrispondenza', content: '<p><strong>Destinatario:</strong> …</p><p><strong>Oggetto:</strong> …</p><p>Gentile …,</p><p>con la presente desidero …</p><p>…</p><p>Cordiali saluti.</p><p><strong>Firma</strong><br/>…</p>' },
];
function escapeTemplateText(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }


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
  onToggleInk: () => void;
  inkMode: boolean;
}

export function Ribbon({ editor, onToggleInk, inkMode }: RibbonProps) {
  const [activeTab, setActiveTab] = useState<'Home' | 'Inserisci' | 'Tabella' | 'Layout' | 'Studio' | 'Pagine' | 'Modelli'>('Home');
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [pageFormat, setPageFormat] = useState<PageFormat>('A4');
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait');
  const [pageMargins, setPageMargins] = useState<PageMargins>('custom');
  const [customMargins, setCustomMargins] = useState<PageMarginValues>(DEFAULT_CUSTOM_MARGINS);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<EditorTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  useEffect(() => {
    try {
      const savedLayout = window.localStorage.getItem(PAGE_LAYOUT_KEY);
      const rawLayout = savedLayout || window.localStorage.getItem(LEGACY_PAGE_LAYOUT_KEY);
      if (rawLayout) {
        const value = JSON.parse(rawLayout);
        if (['A4','A5','A3','Letter'].includes(value?.format)) setPageFormat(value.format);
        if (['portrait','landscape'].includes(value?.orientation)) setPageOrientation(value.orientation);
        if (savedLayout) {
          if (['normal','narrow','wide','custom'].includes(value?.margins)) setPageMargins(value.margins);
          if (value?.customMargins && typeof value.customMargins === 'object') {
            setCustomMargins({
              top: clampMargin(value.customMargins.top),
              right: clampMargin(value.customMargins.right),
              bottom: clampMargin(value.customMargins.bottom),
              left: clampMargin(value.customMargins.left),
            });
          }
        } else {
          // Old versions only stored a preset, not four independent sides. Start with compact margins.
          setPageMargins('custom');
          setCustomMargins(DEFAULT_CUSTOM_MARGINS);
        }
      }
      const rawTemplates = window.localStorage.getItem(CUSTOM_TEMPLATE_KEY);
      if (rawTemplates) { const value = JSON.parse(rawTemplates); if (Array.isArray(value)) setCustomTemplates(value.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.category === 'string' && typeof item.content === 'string' && item.custom === true)); }
    } catch { toast.error('Alcune preferenze locali non sono state caricate.'); }
    finally { setTemplatesLoaded(true); setLayoutLoaded(true); }
  }, []);
  useEffect(() => {
    if (!editor || !layoutLoaded) return;
    const dimensions = PAGE_DIMENSIONS[pageFormat];
    const width = pageOrientation === 'portrait' ? dimensions.width : dimensions.height;
    const height = pageOrientation === 'portrait' ? dimensions.height : dimensions.width;
    const presetMargin = pageMargins === 'custom' ? null : PAGE_MARGIN_MM[pageMargins];
    const margins = presetMargin === null
      ? customMargins
      : { top: presetMargin, right: presetMargin, bottom: presetMargin, left: presetMargin };
    editor.view.dom.style.setProperty('--md-page-width', width + 'mm');
    editor.view.dom.style.setProperty('--md-page-height', height + 'mm');
    (Object.keys(margins) as PageMarginSide[]).forEach((side) => {
      editor.view.dom.style.setProperty('--md-page-padding-' + side, margins[side] + 'mm');
    });
    // PaginationPlus calculates page breaks separately from CSS; keep both models in sync (mm -> CSS px).
    editor.commands.updateMargins({
      top: margins.top * 96 / 25.4,
      right: margins.right * 96 / 25.4,
      bottom: margins.bottom * 96 / 25.4,
      left: margins.left * 96 / 25.4,
    });
    try {
      window.localStorage.setItem(PAGE_LAYOUT_KEY, JSON.stringify({
        format: pageFormat,
        orientation: pageOrientation,
        margins: pageMargins,
        customMargins,
      }));
    } catch {}
  }, [editor, pageFormat, pageOrientation, pageMargins, customMargins, layoutLoaded]);
  useEffect(() => { if (!templatesLoaded) return; try { window.localStorage.setItem(CUSTOM_TEMPLATE_KEY, JSON.stringify(customTemplates)); } catch { toast.error('Spazio locale insufficiente per salvare il modello personale.'); } }, [customTemplates, templatesLoaded]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (!(event.ctrlKey || event.metaKey) || !event.altKey) return; if (event.key.toLowerCase() === 'p') { event.preventDefault(); setActiveTab('Pagine'); } if (event.key.toLowerCase() === 'm') { event.preventDefault(); setActiveTab('Modelli'); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  const insertTemplate = (template: EditorTemplate) => { editor?.chain().focus().insertContent(template.content).run(); toast.success('Modello inserito: ' + template.name); };
  const saveCustomTemplate = () => {
    const name = templateName.trim(), body = templateBody.trim();
    if (name.length < 2) { toast.error('Inserisci un nome per il modello.'); return; }
    if (body.length < 5) { toast.error('Inserisci il contenuto del modello.'); return; }
    if (body.length > 12000) { toast.error('Il modello è troppo lungo.'); return; }
    const content = body.split(/\r?\n/).map((line) => line.trim() ? '<p>' + escapeTemplateText(line.trim()) + '</p>' : '<p><br/></p>').join('');
    setCustomTemplates((items) => [{ id: 'custom-' + Date.now().toString(36), name: name.slice(0, 80), category: 'Personale', content, custom: true }, ...items]); setTemplateName(''); setTemplateBody(''); toast.success('Modello salvato in questo browser.');
  };

  if (!editor) return null;

  const TabButton = ({ name }: { name: typeof activeTab }) => (
    <button 
      type="button"
      onClick={() => setActiveTab(name)}
      className={cn(
        "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
        activeTab === name 
          ? "border-teal-600 bg-teal-50/70 text-teal-700" 
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
        "rounded-lg p-2 flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600",
        isActive ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div data-md-ribbon="true" className="z-40 flex flex-col border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-xl print:hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-1">
        <TabButton name="Home" />
        <TabButton name="Inserisci" />
        {editor.isActive('table') && <TabButton name="Tabella" />}
        <TabButton name="Layout" />
        <TabButton name="Studio" />
        <TabButton name="Pagine" />
        <TabButton name="Modelli" />
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
                  <Palette className="w-4 h-4 text-teal-600" />
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
              className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
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

        {activeTab === 'Modelli' && (
          <div className="flex w-full flex-col gap-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">Modelli per Infermieristica e accesso a Medicina</p><p className="text-[11px] text-slate-500">Scegli una struttura e adattala ai tuoi appunti.</p></div><span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-800">Solo studio: non inserire dati identificativi di pazienti reali.</span></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{[...BUILTIN_TEMPLATES, ...customTemplates].map((template) => <div key={template.id} className="flex items-stretch gap-1"><button type="button" onClick={() => insertTemplate(template)} className="md-template-card"><span>{template.name}</span><span className="text-[10px] font-normal text-slate-500">{template.category}{template.custom ? ' · personale' : ''}</span></button>{template.custom && <button type="button" onClick={() => setCustomTemplates((items) => items.filter((item) => item.id !== template.id))} title={'Elimina ' + template.name} className="rounded-lg px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">×</button>}</div>)}</div>
          <details className="rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Crea modello personale</summary><div className="mt-3 grid gap-2"><input value={templateName} onChange={(e) => setTemplateName(e.target.value)} maxLength={80} placeholder="Nome del modello" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"/><textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} maxLength={12000} rows={4} placeholder="Una riga per paragrafo…" className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-5"/><button type="button" onClick={saveCustomTemplate} className="md-primary-button justify-self-start">Salva modello</button></div></details></div>
        )}

        {activeTab === 'Inserisci' && (
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-200 rounded text-slate-700 text-xs font-medium bg-white border border-slate-300"
            >
              <TableIcon className="w-4 h-4 text-teal-600" /> <span>Inserisci Tabella</span>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              aria-label="Scegli immagine dal dispositivo"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                input.value = '';
                if (!file) return;
                const targetEditor = editor;
                if (targetEditor.isDestroyed || !targetEditor.view.dom.isConnected) {
                  toast.error('L’editor non è pronto. Riapri il documento e riprova.');
                  return;
                }
                const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                  toast.error('Scegli un’immagine PNG, JPG, WEBP o GIF.');
                  return;
                }
                if (file.size > 12 * 1024 * 1024) {
                  toast.error('Scegli un’immagine originale sotto 12 MB: verrà ridimensionata automaticamente.');
                  return;
                }
                let imageStage: 'preparazione' | 'inserimento' = 'preparazione';
                try {
                  const src = await readCompressedImage(file);
                  // Compression is async: the user may have switched or closed the editor meanwhile.
                  if (targetEditor.isDestroyed || !targetEditor.view.dom.isConnected) {
                    toast.error('Il documento è cambiato mentre preparavo l’immagine. Riapri il documento corretto e riprova.');
                    return;
                  }
                  imageStage = 'inserimento';
                  const inserted = targetEditor.chain().focus().setImage({
                    src, alt: file.name.replace(/\.[^.]+$/, ''),
                  }).run();
                  if (!inserted) throw new Error('L’immagine non è stata inserita. Clicca nel foglio e riprova.');
                  toast.success('Immagine ridimensionata e inserita nel documento.');
                } catch (error) {
                  console.error('[MedicalDocs] Errore durante ' + imageStage + ' dell’immagine.', error);
                  toast.error(error instanceof Error ? error.message : 'Non è stato possibile leggere questa immagine.');
                }
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
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
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
            >
              <ImageIcon className="h-4 w-4 text-teal-600" /> <span>Da link</span>
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
              onClick={onToggleInk}
              aria-pressed={inkMode}
              className={"flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition " + (inkMode ? "border-indigo-300 bg-indigo-100 text-indigo-900 ring-2 ring-indigo-200" : "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100")}
            >
              <PenLine className="h-4 w-4" /> {inkMode ? 'Termina scrittura' : 'Scrivi sul foglio'}
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
              <Rows className="w-3.5 h-3.5 text-teal-600" /> <span>+ Riga</span>
            </button>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 bg-white border rounded text-xs hover:bg-slate-100 flex items-center space-x-1">
              <Columns className="w-3.5 h-3.5 text-teal-600" /> <span>+ Colonna</span>
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

        {activeTab === 'Pagine' && (
          <div className="flex w-full flex-col gap-3"><div><p className="text-sm font-semibold text-slate-800">Pagine ed elementi pronti</p><p className="text-[11px] text-slate-500">Inserisci strutture modificabili nel documento.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <button type="button" className="md-tool-card" onClick={() => editor.chain().focus().insertContent('<h1 style="text-align:center">Titolo del documento</h1><p style="text-align:center">Sottotitolo</p><p style="text-align:center">Nome e data</p><hr/><h2>Introduzione</h2><p>…</p><div data-page-break="true" class="page-break-marker"></div>').run()}>Copertina</button>
            <button type="button" className="md-tool-card" onClick={() => { editor.chain().focus().insertContent({ type: 'pageBreak' }).run(); editor.chain().focus().insertContent('<p><br/></p>').run(); }}>Pagina bianca</button>
            <button type="button" className="md-tool-card" onClick={() => editor.chain().focus().insertContent('<h1>Appunti della lezione</h1><p><strong>Materia:</strong> …　<strong>Data:</strong> …</p><h2>Obiettivi</h2><p>…</p><h2>Concetti chiave</h2><ul><li><p>…</p></li></ul><h2>Riepilogo</h2><p>…</p>').run()}>Pagina appunti</button>
            <button type="button" className="md-tool-card" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Tabella 3×3</button>
            <button type="button" className="md-tool-card" onClick={() => editor.chain().focus().insertContent('<h2>Tabella comparativa</h2><table><tbody><tr><th><p>Caratteristica</p></th><th><p>Voce A</p></th><th><p>Voce B</p></th></tr><tr><td><p>Definizione</p></td><td><p>…</p></td><td><p>…</p></td></tr><tr><td><p>Elementi chiave</p></td><td><p>…</p></td><td><p>…</p></td></tr></tbody></table>').run()}>Tabella comparativa</button>
            <button type="button" className="md-tool-card" onClick={() => editor.chain().focus().insertContent('<h2>Checklist di studio</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Ho studiato la teoria</p></li><li data-type="taskItem" data-checked="false"><p>Ho fatto i quiz</p></li><li data-type="taskItem" data-checked="false"><p>Ho corretto gli errori</p></li></ul>').run()}>Checklist</button>
          </div></div>
        )}

        {activeTab === 'Layout' && (
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-700">Formato
                <select value={pageFormat} onChange={(e) => setPageFormat(e.target.value as PageFormat)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                  <option value="A4">A4</option><option value="A5">A5</option><option value="A3">A3</option><option value="Letter">Letter</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">Orientamento
                <select value={pageOrientation} onChange={(e) => setPageOrientation(e.target.value as PageOrientation)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                  <option value="portrait">Verticale</option><option value="landscape">Orizzontale</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">Margini
                <select value={pageMargins} onChange={(e) => setPageMargins(e.target.value as PageMargins)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                  <option value="custom">Personalizzati</option><option value="narrow">Minimi · 3 mm</option><option value="normal">Compatti · 12 mm</option><option value="wide">Larghi · 25,4 mm</option>
                </select>
              </label>
              <button type="button" onClick={() => editor.chain().focus().insertContent({ type: 'pageBreak' }).run()}
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50">
                <SplitSquareHorizontal className="h-4 w-4 text-indigo-600" /> Inserisci nuova pagina
              </button>
            </div>
            {pageMargins === 'custom' && (
              <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-xs font-bold text-slate-800">Margini personalizzati</p><p className="text-[11px] text-slate-500">Imposta ogni lato in millimetri · da 0 a 40 mm</p></div>
                  <button type="button" onClick={() => setCustomMargins({ top: 4, right: 4, bottom: 4, left: 4 })} className="min-h-9 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100">Ripristina 4 mm</button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    { side: 'top', label: 'Superiore' },
                    { side: 'right', label: 'Destro' },
                    { side: 'bottom', label: 'Inferiore' },
                    { side: 'left', label: 'Sinistro' },
                  ] as Array<{ side: PageMarginSide; label: string }>).map(({ side, label }) => (
                    <label key={side} className="grid gap-1 text-[11px] font-semibold text-slate-700">
                      {label}
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white pr-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                        <input type="number" min="0" max="40" step="0.5" value={customMargins[side]}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (event.target.value !== '' && Number.isFinite(value)) {
                              setCustomMargins((current) => ({ ...current, [side]: clampMargin(value) }));
                              setPageMargins('custom');
                            }
                          }}
                          className="min-h-10 w-full min-w-0 border-0 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
                          aria-label={'Margine ' + label.toLowerCase() + ' in millimetri'} />
                        <span className="text-xs text-slate-400">mm</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
