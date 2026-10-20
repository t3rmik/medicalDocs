'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'

const messages = [
  'Sei bravissima, Ylenia. Fai un passo alla volta: io faccio sempre il tifo per te. ❤️',
  'Promemoria del tuo fan numero uno: sei capace di molto più di quanto pensi. 🎓',
  'Amore, spero che oggi tu riesca a ritagliarti anche un piccolo momento per sorridere. Ti amo. 💗',
  'Non devi fare tutto in una volta. Una pagina, un concetto, un respiro alla volta. 🌷',
  'Se potessi, ora ti porterei una merenda, un abbraccio e un bacio sulla fronte. ☕💕',
  'Sono orgoglioso di te, anche nei giorni in cui studiare sembra più difficile. Sempre. ❤️',
  'La mia parte preferita della giornata? Sapere che esisti. La laurea è solo un altro traguardo da festeggiare insieme. ✨',
  'Piccolo promemoria: bere un po’ d’acqua e sciogliere le spalle. Il tuo benessere conta, amore. 💧',
  'Sei intelligente, tenace e hai un cuore bellissimo. Io ho una fortuna enorme ad averti accanto. 🩷',
  'Non serve una giornata perfetta per fare progressi. Basta esserci e continuare con gentilezza verso te stessa. 🌱',
  'Vorrei essere lì per stringerti la mano e dirti: “Ce la facciamo, amore mio”. 🫶',
  'Sei molto più dei tuoi esami e dei tuoi risultati. Ti voglio bene per ciò che sei, ogni giorno. 💞',
  'Una pausa non è tempo perso: è un modo per prenderti cura della persona che amo. 🌼',
  'La futura dottoressa sta facendo del suo meglio, e questo vale tantissimo. Un bacio da Fra. 😘',
  'Anche se oggi hai concluso solo una piccola cosa, è comunque una cosa in più rispetto a ieri. Brava! ⭐',
  'Ti manderei un abbraccio formato coperta, di quelli da cui non si scappa per almeno cinque minuti. 🧸❤️',
  'Non devi dimostrare niente a nessuno in questo momento. Respira, concentrati sul prossimo passo e fidati di te. 🌸',
  'Il tuo sorriso è una delle cose che preferisco al mondo. Spero di regalartene uno anche da lontano. 💌',
  'Ogni tanto alza lo sguardo dallo schermo: il mondo è grande, e io sono qui a volerti bene. 🌙',
  'Sei la mia persona preferita anche con i capelli in disordine, gli appunti ovunque e la stanchezza addosso. 💘',
  'Forza amore, un argomento alla volta. E dopo lo studio, ti prenoto un abbraccio lunghissimo. 📚🤗',
  'Anche il viaggio più lungo si fa una curva alla volta. Tu pensa al prossimo passo: al tifo per te ci penso io. 🏍️❤️',
  'Pit-stop, amore: sciogli le spalle, bevi un sorso d’acqua e riparti con calma. La tua squadra è sempre con te. 🏁',
  'Se oggi la strada sembra piena di curve, non devi affrontarle tutte insieme. Una alla volta, pilota del mio cuore. 🏍️💛',
  'Casco allacciato, cuore leggero e un passo alla volta: sei molto più forte di quanto pensi. Ti mando un bacio al traguardo. 🏁😘',
  'Non sei sola nei momenti pesanti. Anche quando non sono lì, faccio il tifo per te con tutto il cuore. 💖',
  'Ti auguro una giornata gentile, con qualche piccola vittoria e almeno una cosa che ti faccia ridere. ☀️',
  'Nota importante: sei amata adesso, non solo quando avrai finito tutto quello che devi fare. ❤️',
  'La corona d’alloro sarà bellissima, ma niente batte la luce che hai quando parli delle cose che ami. 🎓🌹',
  'Se oggi serve andare piano, andiamo piano. Non c’è nessuna fretta di essere perfetti. Un bacio, Fra. 💋',
  'Ti mando un bacio virtuale da conservare per quando il capitolo diventa troppo complicato. 😚',
  'Sono dalla tua parte nei giorni produttivi e in quelli in cui serve solo riposare. Sempre la tua squadra. 🫂',
]

export function LoveMessages() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastIndex = -1
    let stopped = false

    const showLove = () => {
      if (stopped) return

      let nextIndex = Math.floor(Math.random() * messages.length)
      if (messages.length > 1 && nextIndex === lastIndex) {
        nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length
      }
      lastIndex = nextIndex
      const message = messages[nextIndex]

      toast((t) => (
        <div className="relative flex items-start gap-2.5 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-slate-700 via-sky-600 to-amber-400" />
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-lg shadow-sm" aria-hidden="true">
            🏍️
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[13px] font-extrabold tracking-tight text-slate-800 sm:text-sm">Pit-stop del cuore</p>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-amber-800">tifo speciale</span>
            </div>
            <p className="mt-1 text-[12px] leading-[1.45] text-slate-700 sm:text-[13px]">{message}</p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              <span className="h-px w-5 bg-amber-400" />
              Con amore, Fra
              <span aria-hidden="true">♥</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            aria-label="Chiudi messaggio"
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-[11px] font-bold text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            ✕
          </button>
        </div>
      ), {
        duration: 30000,
        position: 'top-right',
        style: {
          background: 'linear-gradient(138deg, #ffffff 0%, #f0f9ff 52%, #fffbeb 100%)',
          color: '#1e293b',
          border: '1px solid #94a3b8',
          borderRadius: '18px',
          boxShadow: '0 14px 32px -16px rgba(15, 23, 42, 0.5), inset 0 0 0 2px rgba(255,255,255,0.85)',
          maxWidth: 'min(340px, calc(100vw - 24px))',
          padding: '11px 12px 10px',
        },
      })

      // Intervallo casuale tra 4 e 8 minuti: meno prevedibile e meno invasivo.
      const nextDelay = 240000 + Math.floor(Math.random() * 240001)
      timer = setTimeout(showLove, nextDelay)
    }

    timer = setTimeout(showLove, 4000 + Math.floor(Math.random() * 6001))

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return null
}
