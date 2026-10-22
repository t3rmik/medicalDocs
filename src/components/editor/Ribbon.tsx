'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen as BookOpenTab, Files as PagesTab, Home as HomeTab, Layout as LayoutTab, Sparkles as StudyTab, Table2 as TableTab, FilePlus as InsertTab, X as CloseTab, Menu as MobileMenuTab, ChevronDown as MobileChevronTab } from 'lucide-react'
import { Editor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import toast from 'react-hot-toast'
import {
  MedicalDocsBold as Bold,
  MedicalDocsItalic as Italic,
  MedicalDocsUnderlineIcon as UnderlineIcon,
  MedicalDocsStrikethrough as Strikethrough,
  MedicalDocsSubscript as Subscript,
  MedicalDocsSuperscript as Superscript,
  MedicalDocsAlignLeft as AlignLeft,
  MedicalDocsAlignCenter as AlignCenter,
  MedicalDocsAlignRight as AlignRight,
  MedicalDocsAlignJustify as AlignJustify,
  MedicalDocsList as List,
  MedicalDocsListOrdered as ListOrdered,
  MedicalDocsCheckSquare as CheckSquare,
  MedicalDocsPalette as Palette,
  MedicalDocsHighlighter as Highlighter,
  MedicalDocsTableIcon as TableIcon,
  MedicalDocsImageIcon as ImageIcon,
  MedicalDocsSplitSquareHorizontal as SplitSquareHorizontal,
  MedicalDocsUndo as Undo,
  MedicalDocsRedo as Redo,
  MedicalDocsRemoveFormatting as RemoveFormatting,
  MedicalDocsRows as Rows,
  MedicalDocsColumns as Columns,
  MedicalDocsTrash2 as Trash2,
  MedicalDocsFileUp as FileUp,
  MedicalDocsPen as PenLine,
  MedicalDocsArrowUp as ArrowUp,
  MedicalDocsArrowDown as ArrowDown,
  MedicalDocsMerge as Merge,
} from '@/components/icons/MedicalDocsIcons'
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
const FONT_SIZE_OPTIONS = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt', '48pt'] as const;
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
  const [tabletPanelOpen, setTabletPanelOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
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
  const [equationOpen, setEquationOpen] = useState(false);
  const [equationLatex, setEquationLatex] = useState('x^2 + y^2 = z^2');
  const [selectedFontSize, setSelectedFontSize] = useState('12pt');

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
    if (!editor) return
    const syncSelectedFontSize = () => {
      const size = editor.getAttributes('textStyle').fontSize
      const nextSize = typeof size === 'string' && size.trim() ? size : '12pt'
      setSelectedFontSize((current) => current === nextSize ? current : nextSize)
    }
    syncSelectedFontSize()
    editor.on('selectionUpdate', syncSelectedFontSize)
    editor.on('transaction', syncSelectedFontSize)
    return () => {
      editor.off('selectionUpdate', syncSelectedFontSize)
      editor.off('transaction', syncSelectedFontSize)
    }
  }, [editor])

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

  const openEquationDialog = () => {
    setEquationLatex('x^2 + y^2 = z^2')
    setEquationOpen(true)
  }
  const insertEquation = () => {
    const latex = equationLatex.trim()
    if (!latex) { toast.error('Scrivi una formula prima di inserirla.'); return }
    if (!editor || editor.isDestroyed) { toast.error("L'editor non è pronto."); return }
    const inserted = editor.chain().focus().insertContent({ type: 'mathEquation', attrs: { latex } }).run()
    if (inserted) {
      setEquationOpen(false)
      toast.success('Equazione inserita. Doppio clic sulla formula per modificarla.')
    } else {
      toast.error("Non è stato possibile inserire l'equazione in questa posizione.")
    }
  }

  if (!editor) return null;

  const applyFontSize = (fontSize: string) => {
    if (editor.isDestroyed || !fontSize) return
    setSelectedFontSize(fontSize)
    editor.chain().focus().setMark('textStyle', { fontSize }).run()
  }


  const findSelectedTable = () => {
    const { state } = editor
    if (state.selection instanceof NodeSelection && state.selection.node.type.name === 'table') {
      return { pos: state.selection.from, node: state.selection.node }
    }
    const $from = state.selection.$from
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth)
      if (node.type.name === 'table') return { pos: $from.before(depth), node }
    }
    return null
  }

  const moveSelectedTable = (direction: 'up' | 'down') => {
    const tableContext = findSelectedTable()
    if (!tableContext) {
      toast.error('Posiziona il cursore dentro la tabella da spostare.')
      return
    }
    const entries: Array<{ node: any; pos: number }> = []
    editor.state.doc.forEach((node, pos) => entries.push({ node, pos }))
    const index = entries.findIndex((entry) => entry.pos === tableContext.pos && entry.node.type.name === 'table')
    const neighborIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || neighborIndex < 0 || neighborIndex >= entries.length) {
      toast('La tabella è già al limite del documento in questa direzione.')
      return
    }
    const neighbor = entries[neighborIndex]
    const targetPos = direction === 'up' ? neighbor.pos : tableContext.pos + neighbor.node.nodeSize
    const tr = editor.state.tr.delete(tableContext.pos, tableContext.pos + tableContext.node.nodeSize)
    tr.insert(targetPos, tableContext.node)
    tr.setSelection(NodeSelection.create(tr.doc, targetPos))
    editor.view.dispatch(tr.scrollIntoView())
    toast.success(direction === 'up' ? 'Tabella spostata verso l’alto.' : 'Tabella spostata verso il basso.')
  }

  const resizeSelectedTable = (delta: number) => {
    const table = findSelectedTable()
    if (!table) {
      toast.error('Posiziona il cursore dentro una tabella.')
      return
    }
    const current = Number(table.node.attrs.mdWidth) || 100
    const next = Math.max(35, Math.min(100, current + delta))
    editor.chain().focus().updateAttributes('table', { mdWidth: next }).run()
  }

  const setSelectedTableWidth = (width: number) => {
    if (!findSelectedTable()) {
      toast.error('Posiziona il cursore dentro una tabella.')
      return
    }
    editor.chain().focus().updateAttributes('table', { mdWidth: width }).run()
  }

  const setSelectedTableAlignment = (mdAlign: 'left' | 'center' | 'right') => {
    if (!findSelectedTable()) {
      toast.error('Posiziona il cursore dentro una tabella.')
      return
    }
    editor.chain().focus().updateAttributes('table', { mdAlign }).run()
  }

  const setSelectedTableDensity = (mdDensity: 'compact' | 'normal' | 'comfortable') => {
    if (!findSelectedTable()) {
      toast.error('Posiziona il cursore dentro una tabella.')
      return
    }
    editor.chain().focus().updateAttributes('table', { mdDensity }).run()
  }

  const TabButton = ({ name }: { name: typeof activeTab }) => {
    const Icon = name === 'Home' ? HomeTab
      : name === 'Inserisci' ? InsertTab
      : name === 'Tabella' ? TableTab
      : name === 'Layout' ? LayoutTab
      : name === 'Studio' ? StudyTab
      : name === 'Pagine' ? PagesTab
      : BookOpenTab;
    const selected = activeTab === name;
    return (
      <button
        type="button"
        data-md-ribbon-tab={name}
        onClick={() => {
          setTabletPanelOpen(selected ? !tabletPanelOpen : true);
          setMobileToolsOpen(true);
          setActiveTab(name);
        }}
        aria-expanded={selected && tabletPanelOpen}
        aria-controls="medicaldocs-ribbon-tools"
        title={name}
        className={cn(
          "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
          selected ? "border-teal-600 bg-teal-50/70 text-teal-700" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Icon className="md-ribbon-tab-icon h-4 w-4" aria-hidden="true" />
        <span className="md-ribbon-tab-label">{name}</span>
      </button>
    );
  };

  const IconButton = ({ onClick, isActive = false, disabled = false, icon: Icon, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
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
    <div data-md-ribbon="true" data-md-active-tab={activeTab} data-md-tools-open={tabletPanelOpen ? 'true' : 'false'} data-md-mobile-tools-open={mobileToolsOpen ? 'true' : 'false'} data-md-ink-active={inkMode ? 'true' : 'false'} className="z-40 flex flex-col border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-xl print:hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-1">
        <button type="button" data-md-mobile-ribbon-toggle="true" onClick={() => setMobileToolsOpen((open) => !open)} aria-expanded={mobileToolsOpen} aria-controls="medicaldocs-ribbon-tools" className="md-mobile-ribbon-toggle" aria-label={mobileToolsOpen ? 'Nascondi strumenti documento' : 'Mostra strumenti documento'}>
          {mobileToolsOpen ? <CloseTab className="h-4 w-4" aria-hidden="true" /> : <MobileMenuTab className="h-4 w-4" aria-hidden="true" />}
          <span>{mobileToolsOpen ? 'Chiudi strumenti' : 'Strumenti'}</span>
          {!mobileToolsOpen && <MobileChevronTab className="h-4 w-4" aria-hidden="true" />}
        </button>
        <TabButton name="Home" />
        <TabButton name="Inserisci" />
        {editor.isActive('table') && <TabButton name="Tabella" />}
        <TabButton name="Layout" />
        <TabButton name="Studio" />
        <TabButton name="Pagine" />
        <TabButton name="Modelli" />
      </div>

      <div id="medicaldocs-ribbon-tools" data-md-tool-panel="true" className="flex min-h-[54px] flex-wrap items-center gap-3 overflow-x-auto p-2.5">
        <div data-md-tablet-tools-header="true" className="hidden items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Strumenti</p>
            <p className="truncate text-sm font-bold text-slate-900">{activeTab}</p>
          </div>
          <button type="button" onClick={() => setTabletPanelOpen(false)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700" aria-label="Chiudi pannello strumenti">
            <CloseTab className="h-4 w-4" aria-hidden="true" /> Chiudi
          </button>
        </div>
        {activeTab === 'Home' && (
          <>
            <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
              <IconButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annulla" />
              <IconButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ripristina" />
              <IconButton icon={RemoveFormatting} onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Cancella formattazione" />
            </div>

            <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
              <select 
                className="min-h-9 w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-teal-300 hover:bg-teal-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
              >
                <option value="Calibri">Calibri</option>
                <option value="Arial">Arial</option>
                <option value="Inter">Inter</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>
              <select
                value={selectedFontSize}
                onChange={(event) => applyFontSize(event.target.value)}
                aria-label="Dimensione del testo"
                title="Dimensione del testo"
                className="min-h-9 w-[88px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-teal-300 hover:bg-teal-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {!FONT_SIZE_OPTIONS.includes(selectedFontSize as (typeof FONT_SIZE_OPTIONS)[number]) && (
                  <option value={selectedFontSize}>{selectedFontSize}</option>
                )}
                {FONT_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size.replace('pt', ' pt')}</option>
                ))}
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
          <div className="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-200 rounded text-slate-700 text-xs font-medium bg-white border border-slate-300"
            >
              <TableIcon className="w-4 h-4 text-teal-600" /> <span>Inserisci Tabella</span>
            </button>

            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5" role="group" aria-label="Simboli greci">
              <span className="px-1 text-[11px] font-semibold text-slate-500">Greco</span>
              {[
                { value: 'Α', label: 'Alpha maiuscola' }, { value: 'α', label: 'Alpha minuscola' },
                { value: 'Β', label: 'Beta maiuscola' }, { value: 'β', label: 'Beta minuscola' },
                { value: 'Γ', label: 'Gamma maiuscola' }, { value: 'γ', label: 'Gamma minuscola' },
                { value: 'Δ', label: 'Delta maiuscola' }, { value: 'δ', label: 'Delta minuscola' },
              ].map((symbol) => (
                <button key={symbol.label} type="button" title={symbol.label} aria-label={symbol.label}
                  onClick={() => editor.chain().focus().insertContent(symbol.value).run()}
                  className="min-h-8 min-w-8 rounded-lg border border-transparent bg-white px-2 text-base font-semibold text-indigo-800 shadow-sm hover:border-indigo-200 hover:bg-indigo-50">
                  {symbol.value}
                </button>
              ))}
            </div>
            <button type="button" onClick={openEquationDialog}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100"
              title="Inserisci un'equazione modificabile">
              <span className="text-base font-bold">∑ =</span> Equazione
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
          <div className="flex w-full flex-wrap items-center gap-2 p-1.5">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Sposta tabella">
              <button type="button" onClick={() => moveSelectedTable('up')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50" title="Sposta la tabella prima del blocco precedente"><ArrowUp className="mr-1 inline h-3.5 w-3.5" />Sposta su</button>
              <button type="button" onClick={() => moveSelectedTable('down')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50" title="Sposta la tabella dopo il blocco successivo"><ArrowDown className="mr-1 inline h-3.5 w-3.5" />Sposta giù</button>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Ridimensiona tabella">
              <span className="px-1 text-[11px] font-semibold text-slate-500">Larghezza</span>
              <button type="button" onClick={() => resizeSelectedTable(-10)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-teal-50" title="Riduci larghezza del 10%">− 10%</button>
              <button type="button" onClick={() => resizeSelectedTable(10)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-teal-50" title="Aumenta larghezza del 10%">+ 10%</button>
              <button type="button" onClick={() => setSelectedTableWidth(100)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Adatta alla pagina</button>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Allineamento tabella">
              <button type="button" onClick={() => setSelectedTableAlignment('left')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Sinistra</button>
              <button type="button" onClick={() => setSelectedTableAlignment('center')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Centro</button>
              <button type="button" onClick={() => setSelectedTableAlignment('right')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Destra</button>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Spaziatura celle">
              <button type="button" onClick={() => setSelectedTableDensity('compact')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Compatta</button>
              <button type="button" onClick={() => setSelectedTableDensity('normal')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Normale</button>
              <button type="button" onClick={() => setSelectedTableDensity('comfortable')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-teal-50">Ampia</button>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Modifica struttura tabella">
              <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Riga sopra</button>
              <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Rows className="mr-1 inline h-3.5 w-3.5 text-teal-600" />+ Riga sotto</button>
              <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Colonna prima</button>
              <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Columns className="mr-1 inline h-3.5 w-3.5 text-teal-600" />+ Colonna dopo</button>
              <button type="button" onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Intestazione</button>
              <button type="button" disabled={!editor.can().mergeCells()} onClick={() => editor.chain().focus().mergeCells().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Merge className="mr-1 inline h-3.5 w-3.5" />Unisci celle</button>
              <button type="button" disabled={!editor.can().splitCell()} onClick={() => editor.chain().focus().splitCell().run()} className="min-h-10 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><SplitSquareHorizontal className="mr-1 inline h-3.5 w-3.5" />Dividi cella</button>
              <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="min-h-10 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100">Elimina riga</button>
              <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="min-h-10 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100">Elimina colonna</button>
              <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="min-h-10 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Elimina tabella</button>
            </div>
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
                <select value={pageFormat} onChange={(e) => setPageFormat(e.target.value as PageFormat)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-teal-300 hover:bg-teal-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                  <option value="A4">A4</option><option value="A5">A5</option><option value="A3">A3</option><option value="Letter">Letter</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">Orientamento
                <select value={pageOrientation} onChange={(e) => setPageOrientation(e.target.value as PageOrientation)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-teal-300 hover:bg-teal-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                  <option value="portrait">Verticale</option><option value="landscape">Orizzontale</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-700">Margini
                <select value={pageMargins} onChange={(e) => setPageMargins(e.target.value as PageMargins)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-teal-300 hover:bg-teal-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
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

      {equationOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEquationOpen(false) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="md-equation-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="md-equation-title" className="text-base font-bold text-slate-900">Inserisci equazione</h2>
                <p className="mt-1 text-xs text-slate-500">Crea formule con uguaglianze, potenze, radici, frazioni e simboli greci.</p>
              </div>
              <button type="button" onClick={() => setEquationOpen(false)} className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100" aria-label="Chiudi finestra">×</button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
              {[
                { label: 'Uguaglianza', value: 'a = b + c' },
                { label: 'Potenze', value: 'x^2 + y^2 = z^2' },
                { label: 'Frazione', value: '\\frac{a}{b} = c' },
                { label: 'Radice', value: '\\sqrt{x} = y' },
                { label: 'Greco', value: '\\alpha + \\beta = \\gamma' },
              ].map((template) => (
                <button key={template.label} type="button" onClick={() => setEquationLatex(template.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50">
                  {template.label}
                </button>
              ))}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); insertEquation() }} className="grid gap-3 px-5 py-4">
              <label htmlFor="md-equation-source" className="text-xs font-semibold text-slate-700">Formula (sintassi tipo LaTeX)</label>
              <textarea id="md-equation-source" value={equationLatex} onChange={(event) => setEquationLatex(event.target.value)}
                placeholder="Es. x^2 + y^2 = z^2 oppure \\frac{a}{b} = c" rows={3} autoFocus maxLength={1500}
                className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <p className="text-[11px] leading-relaxed text-slate-500">Usa ^ per l'apice e _ per il pedice. Per una frazione scrivi \\frac e inserisci numeratore e denominatore tra parentesi graffe; per una radice scrivi \\sqrt seguito dall'espressione sotto radice. Puoi modificare la formula anche dopo averla inserita con un doppio clic.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEquationOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Annulla</button>
                <button type="submit" className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-800">Inserisci nel foglio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
