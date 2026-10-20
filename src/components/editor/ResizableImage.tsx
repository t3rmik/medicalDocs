'use client'
import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Image from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'

type ResizeGesture = { pointerId:number; startX:number; startWidth:number; ratio:number; scaleX:number; maxWidth:number }

function ResizableImageView({node, editor, updateAttributes, selected, getPos}: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement|null>(null)
  const resizeRef = useRef<ResizeGesture|null>(null)
  const previewRef = useRef<number|null>(null)
  const [previewWidth,setPreviewWidth] = useState<number|null>(null)
  const storedWidth = Number(node.attrs.width)||null
  const storedHeight = Number(node.attrs.height)||null
  const shownWidth = previewWidth ?? storedWidth ?? undefined

  const selectImage = () => {
    const pos = typeof getPos === 'function' ? getPos() : undefined
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos)
  }
  const moveImage = (direction:'up'|'down') => {
    const pos = typeof getPos === 'function' ? getPos() : undefined
    if (typeof pos !== 'number') return
    const doc = editor.state.doc
    const current = doc.nodeAt(pos)
    if (!current || current.type.name !== 'image') return
    const resolved = doc.resolve(pos)
    const parent = resolved.parent
    const parentStart = resolved.start(resolved.depth)
    const siblings:Array<{node: typeof current; pos:number}> = []
    parent.forEach((child,offset)=>siblings.push({node:child as typeof current,pos:parentStart+offset}))
    const index = siblings.findIndex(item=>item.pos===pos)
    const target = direction==='up' ? siblings[index-1] : siblings[index+1]
    if (!target) return
    const insertionPos = direction==='up' ? target.pos : pos + target.node.nodeSize
    const tr = editor.state.tr.delete(pos,pos+current.nodeSize).insert(insertionPos,current)
    editor.view.dispatch(tr.scrollIntoView())
    editor.commands.setNodeSelection(insertionPos)
  }
  const startResize = (event:React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault(); event.stopPropagation()
    const img = imageRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const width = Math.max(80,img.clientWidth||storedWidth||rect.width)
    const height = Math.max(40,img.clientHeight||storedHeight||rect.height)
    resizeRef.current = {
      pointerId:event.pointerId,startX:event.clientX,startWidth:width,ratio:height/width,
      scaleX:rect.width/width||1,maxWidth:Math.max(100,editor.view.dom.clientWidth-28)
    }
    previewRef.current=width
    setPreviewWidth(width)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const resizeMove = (event:React.PointerEvent<HTMLButtonElement>) => {
    const gesture=resizeRef.current
    if (!gesture||gesture.pointerId!==event.pointerId) return
    event.preventDefault(); event.stopPropagation()
    const delta=(event.clientX-gesture.startX)/Math.max(.1,gesture.scaleX)
    const width=Math.round(Math.max(80,Math.min(gesture.maxWidth,gesture.startWidth+delta)))
    previewRef.current=width; setPreviewWidth(width)
  }
  const finishResize = (event?:React.PointerEvent<HTMLButtonElement>) => {
    const gesture=resizeRef.current
    if (!gesture||(event&&gesture.pointerId!==event.pointerId)) return
    const width=Math.max(80,Math.min(gesture.maxWidth,Math.round(previewRef.current??gesture.startWidth)))
    updateAttributes({width,height:Math.max(40,Math.round(width*gesture.ratio))})
    resizeRef.current=null; previewRef.current=null; setPreviewWidth(null)
  }
  const adjustSize=(delta:number)=>{
    const img=imageRef.current
    if(!img) return
    const width=img.clientWidth||shownWidth||320
    const maxWidth=Math.max(100,editor.view.dom.clientWidth-28)
    const next=Math.max(80,Math.min(maxWidth,Math.round(width+delta)))
    const ratio=(img.clientHeight||storedHeight||1)/Math.max(1,width)
    updateAttributes({width:next,height:Math.round(next*ratio)})
  }

  return <NodeViewWrapper as="div" contentEditable={false} draggable={true} data-drag-handle="true"
    className={'medicaldocs-resizable-image'+(selected?' is-selected':'')}
    onClick={(event: ReactMouseEvent<HTMLDivElement>)=>{event.stopPropagation();selectImage()}}
    style={{position:'relative',display:'block',width:'fit-content',maxWidth:'100%',margin:'1rem 0',lineHeight:0}}>
    {selected&&<div className="medicaldocs-image-toolbar" contentEditable={false} onPointerDown={(event: ReactPointerEvent<HTMLDivElement>)=>event.stopPropagation()}>
      <span className="medicaldocs-image-toolbar-label">Immagine</span>
      <button type="button" title="Riduci" aria-label="Riduci immagine" onClick={(event: ReactMouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();adjustSize(-40)}}><Minus size={14}/></button>
      <button type="button" title="Ingrandisci" aria-label="Ingrandisci immagine" onClick={(event: ReactMouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();adjustSize(40)}}><Plus size={14}/></button>
      <button type="button" title="Sposta sopra" aria-label="Sposta immagine sopra" onClick={(event: ReactMouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();moveImage('up')}}><ChevronUp size={15}/></button>
      <button type="button" title="Sposta sotto" aria-label="Sposta immagine sotto" onClick={(event: ReactMouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation();moveImage('down')}}><ChevronDown size={15}/></button>
      {shownWidth&&<span className="medicaldocs-image-size">{Math.round(shownWidth)} px</span>}
    </div>}
    <img ref={imageRef} src={typeof node.attrs.src==='string'?node.attrs.src:''}
      alt={typeof node.attrs.alt==='string'?node.attrs.alt:''}
      title={typeof node.attrs.title==='string'?node.attrs.title:undefined} draggable={true}
      style={{display:'block',width:shownWidth?String(shownWidth)+'px':'auto',height:'auto',maxWidth:'100%',borderRadius:6,
        outline:selected?'2px solid #0f9488':'1px solid transparent',outlineOffset:selected?2:0,cursor:'grab',userSelect:'none',WebkitUserSelect:'none'}}/>
    {selected&&<button type="button" className="medicaldocs-image-resize-handle" title="Trascina per ridimensionare"
      aria-label="Ridimensiona immagine trascinando" onPointerDown={startResize} onPointerMove={resizeMove}
      onPointerUp={finishResize} onPointerCancel={finishResize} onLostPointerCapture={(event: ReactPointerEvent<HTMLButtonElement>)=>finishResize(event)}
      onClick={(event: ReactMouseEvent<HTMLButtonElement>)=>{event.preventDefault();event.stopPropagation()}}><span/></button>}
  </NodeViewWrapper>
}

export const ResizableImage = Image.extend({
  draggable:true,
  addAttributes() {
    const parentAttributes=this.parent?.()??{}
    return {...parentAttributes,
      width:{default:null,parseHTML:element=>{const n=Number((element as HTMLElement).getAttribute('width'));return Number.isFinite(n)&&n>0?n:null},renderHTML:attrs=>attrs.width?{width:String(Math.round(Number(attrs.width)))}:{}},
      height:{default:null,parseHTML:element=>{const n=Number((element as HTMLElement).getAttribute('height'));return Number.isFinite(n)&&n>0?n:null},renderHTML:attrs=>attrs.height?{height:String(Math.round(Number(attrs.height)))}:{}}
    }
  },
  addNodeView(){return ReactNodeViewRenderer(ResizableImageView)}
}).configure({allowBase64:true,HTMLAttributes:{class:'editor-image'}})
