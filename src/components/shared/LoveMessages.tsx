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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">💌 Un pensiero per te</p>
            <p className="mt-1 text-sm leading-relaxed">{message}</p>
            <p className="mt-2 text-[10px] font-medium opacity-70">Con amore, Fra ❤️</p>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            aria-label="Chiudi messaggio"
            className="rounded-full bg-pink-100 px-2 py-1 text-xs font-bold text-pink-800 transition hover:bg-pink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"
          >
            ✕
          </button>
        </div>
      ), {
        duration: 30000,
        position: 'top-right',
        style: {
          background: 'linear-gradient(135deg, #fff7fb 0%, #fce7f3 100%)',
          color: '#9d174d',
          border: '1px solid #f9a8d4',
          borderRadius: '16px',
          boxShadow: '0 14px 35px -12px rgba(190, 24, 93, 0.28)',
          maxWidth: '390px',
          padding: '16px',
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
