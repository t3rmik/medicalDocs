'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'

type MessageStyle = 'simple' | 'letter' | 'pitstop' | 'spark' | 'study'
type LoveMessage = {
  text: string
  style: MessageStyle
  icon?: string
  heading?: string
  tag?: string
}

const messages: LoveMessage[] = [
  // Pensieri brevi: devono sembrare spontanei, non sempre una mini-lettera.
  { style: 'simple', icon: '❤️', text: 'Ehi, amore. Ti mando un bacio, tutto qui. ❤️' },
  { style: 'simple', icon: '🫶', text: 'Sono dalla tua parte. Sempre.' },
  { style: 'simple', icon: '💌', text: 'Un pensiero al volo: ti amo tanto.' },
  { style: 'simple', icon: '😘', text: 'Bacio di servizio. Non si accettano reclami. 😘' },
  { style: 'simple', icon: '🌷', text: 'Spero che questo messaggino ti strappi un sorriso.' },
  { style: 'simple', icon: '💗', text: 'Sei il mio posto felice.' },
  { style: 'simple', icon: '⭐', text: 'Brava tu. Anche oggi, proprio tu.' },
  { style: 'simple', icon: '🐻', text: 'Abbraccio in arrivo… ricevuto? 🫂' },
  { style: 'simple', icon: '☀️', text: 'Promemoria: sei amata. Anche adesso.' },
  { style: 'simple', icon: '💋', text: 'Pausa pubblicitaria: Fra ti manda un bacio.' },
  { style: 'simple', icon: '🌼', text: 'Non dimenticare quanto sei speciale per me.' },
  { style: 'simple', icon: '🩷', text: 'Io faccio il tifo per te, anche in silenzio.' },
  { style: 'simple', icon: '✨', text: 'Una piccola cosa alla volta, amore.' },
  { style: 'simple', icon: '🐣', text: 'Questo è un promemoria ufficiale: sei adorabile.' },
  { style: 'simple', icon: '🥰', text: 'Mi manchi. Ecco, dovevo dirtelo.' },
  { style: 'simple', icon: '🌙', text: 'Qualunque giornata sia, per me resti una meraviglia.' },
  { style: 'simple', icon: '💞', text: 'Il mio pensiero preferito oggi? Tu.' },
  { style: 'simple', icon: '🍀', text: 'Un po’ di fortuna, un bacio e tutto il mio tifo.' },
  { style: 'simple', icon: '🧸', text: 'Ti spedisco un mini-abbraccio formato tascabile.' },
  { style: 'simple', icon: '💐', text: 'Non serve un motivo per ricordarti che ti amo.' },
  { style: 'simple', icon: '🎀', text: 'Sei la mia persona preferita. Fine del comunicato.' },
  { style: 'simple', icon: '💖', text: 'Fai un bel respiro. Ci sono, anche da lontano.' },

  // Lettere un po’ più articolate: calde, affettuose e diverse fra loro.
  { style: 'letter', icon: '💌', heading: 'Una letterina per te', text: 'Amore, magari sei immersa negli appunti e hai la testa piena. Volevo solo ricordarti che non sei i tuoi voti né le pagine che riesci a finire. Sei molto di più, e io ti voglio bene in ogni versione di te.' },
  { style: 'letter', icon: '🌷', heading: 'Una cosa importante', text: 'Non devi conquistarti il mio orgoglio facendo tutto alla perfezione. Sono già fiero di te per la costanza, il coraggio e il cuore che ci metti. Oggi procedi come puoi: il resto può aspettare.' },
  { style: 'letter', icon: '☕', heading: 'Ti porto una pausa', text: 'Se fossi lì, arriverei con qualcosa da bere, ti ruberei due minuti e ti darei un abbraccio lunghissimo. Siccome sono a distanza, ti mando qui la versione digitale: vale comunque doppio.' },
  { style: 'letter', icon: '🌙', heading: 'Leggi piano', text: 'Quando la giornata sembra infinita, prova a guardarla solo da vicino: questo paragrafo, questo concetto, questo respiro. Non devi risolvere tutto in una volta. Io credo in te, anche quando tu fai fatica a farlo.' },
  { style: 'letter', icon: '💗', heading: 'Da Fra, senza scadenza', text: 'Ti amo nei giorni pieni di energia e in quelli in cui vorresti solo chiudere tutto e riposare. Non devi essere sempre produttiva per meritare dolcezza. Sei importante prima, durante e dopo ogni traguardo.' },
  { style: 'letter', icon: '🎓', heading: 'Il futuro può attendere un attimo', text: 'Il tuo sogno è importante, ma lo sei anche tu mentre ci stai arrivando. Fai spazio alle pause, al cibo, all’acqua e a una risata ogni tanto. Voglio vederti arrivare lontano senza dimenticarti di stare bene.' },
  { style: 'letter', icon: '🫶', heading: 'La tua squadra', text: 'Non posso studiare al posto tuo, ma posso ricordarti che non sei sola. Sono nella tua squadra quando va tutto bene e soprattutto quando qualcosa si complica. Un passo alla volta: tifiamo insieme.' },
  { style: 'letter', icon: '🌼', heading: 'Per un giorno gentile', text: 'Ti auguro almeno una piccola vittoria, una cosa che finalmente si chiarisce e un momento in cui ti accorgi di essere capace. E se oggi non va così, ti auguro comunque di trattarti con la stessa tenerezza che riserveresti a chi ami.' },
  { style: 'letter', icon: '🩷', heading: 'Non solo esami', text: 'Amo la tua testa curiosa, il modo in cui ti impegni e anche tutte quelle piccole cose che magari tu non noti nemmeno. Gli esami contano per il tuo percorso, ma non possono raccontare tutta la bellissima persona che sei.' },
  { style: 'letter', icon: '💋', heading: 'Consegna speciale', text: 'Il corriere Fra è passato per consegnare un bacio, due complimenti sinceri e una richiesta: non essere troppo dura con te stessa. La destinataria è già meravigliosa e non deve dimostrare il contrario.' },
  { style: 'letter', icon: '🧸', heading: 'Abbraccio in formato testo', text: 'Immagina di appoggiare tutto per un momento, venirmi vicino e non dover spiegare niente. Solo un abbraccio, un respiro lento e la certezza che qualcuno ti vuole bene senza chiederti nulla in cambio.' },
  { style: 'letter', icon: '⭐', heading: 'Ho notato il tuo impegno', text: 'Magari nessuno vede tutte le volte in cui ripeti, ricominci o resisti alla tentazione di mollare. Io voglio che tu sappia una cosa: l’impegno che metti conta, anche quando i risultati non arrivano subito.' },
  { style: 'letter', icon: '🌈', heading: 'Una giornata alla volta', text: 'Non devi avere già tutte le risposte sul futuro. Per oggi basta fare la prossima cosa possibile, poi riposarti quando serve. Il cammino è tuo e non c’è bisogno di correre sempre per meritare di arrivare.' },
  { style: 'letter', icon: '🥹', heading: 'Una confessione piccola', text: 'A volte mi basta pensare a te per sorridere da solo. Quindi, tecnicamente, questa finestrella è anche colpa tua. Ti amo, e spero che adesso tu abbia un motivo in più per sorridere.' },
  { style: 'letter', icon: '💐', heading: 'Fatti un po’ di spazio', text: 'Sei bravissima a impegnarti per ciò che desideri. Ricordati di riservare un po’ di quella cura anche a te: una pausa non cancella il lavoro fatto, e riposare non significa restare indietro.' },

  // Pit-stop: scenette più teatrali e imprevedibili a tema moto.
  { style: 'pitstop', icon: '🏍️', heading: 'Pit-stop del cuore', tag: 'SQUADRA BOX', text: '🚦 Bandiera ai box, pilota! Lascia andare le spalle, bevi un sorso d’acqua e fai due respiri tranquilli. Il tuo team è qui a fare il tifo: il cronometro può aspettare, amore. 🏁' },
  { style: 'pitstop', icon: '🏁', heading: 'Radio box → Ylenia', tag: 'MESSAGGIO TEAM', text: '📻 «Qui box Fra, mi ricevi?» Comunicazione importante: la pilota è fortissima, ma anche le moto migliori hanno bisogno di una sosta. Mini-pausa, un sorriso e poi si riparte quando sei pronta. Ti amo.' },
  { style: 'pitstop', icon: '🧰', heading: 'Meccanici del buonumore', tag: 'TAGLIANDO COMPLETO', text: 'La squadra ha rilevato: spalle forse tese, tante nozioni nel motore e livello abbracci da rabboccare. Intervento consigliato: acqua, stretching leggero e un bacio virtuale firmato Fra. 🏍️❤️' },
  { style: 'pitstop', icon: '🏍️', heading: 'Curva difficile in vista', tag: 'GUIDA CON CALMA', text: 'Anche il percorso più bello ha curve che sembrano complicate. Non serve vedere tutta la strada: basta guardare la prossima curva e affrontarla con calma. Io resto sugli spalti a fare il tifo per te. 🏁' },
  { style: 'pitstop', icon: '🏆', heading: 'Direzione traguardo', tag: 'NESSUN CRONOMETRO', text: 'Piccolo annuncio della direzione gara: oggi non vince chi corre di più, ma chi riesce ad ascoltarsi e a continuare senza dimenticare se stessa. E per me tu sei già una campionessa, casco rosa compreso. 💗' },
  { style: 'pitstop', icon: '🚦', heading: 'Semaforo rosso: pausa!', tag: 'SOSTA OBBLIGATORIA', text: 'Il semaforo è rosso e il regolamento del fidanzato impone una sosta di trenta secondi: sciogli le mani, rilassa la mascella e respira. Al verde riparti con calma. La pole position? Il mio cuore, che è già tua. 🏍️' },
  { style: 'pitstop', icon: '🪖', heading: 'Casco allacciato, amore', tag: 'MESSAGGIO DEL PILOTA', text: 'Casco allacciato, mente curiosa e niente gare contro gli altri. Il tuo percorso ha il suo ritmo e non deve assomigliare a quello di nessuno. Se arriva una salita, la affronti un metro alla volta. Io sono con te.' },
  { style: 'pitstop', icon: '🏍️', heading: 'Il circuito degli esami', tag: 'GIRO DI RICOGNIZIONE', text: 'Davanti ci sono appunti, concetti e qualche curva a gomito. Nessuna pilota deve memorizzare l’intero circuito in un giro solo. Studia il tratto che hai davanti, fai una sosta quando serve e ricordati che sei amata in ogni caso. ❤️' },
  { style: 'pitstop', icon: '🛠️', heading: 'Controllo livelli', tag: 'OFFICINA FRA', text: 'Controllo tecnico rapido: acqua? Un po’ di movimento? Un pensiero gentile verso te stessa? Se manca qualcosa, sistemalo ora. La tua moto può essere velocissima, ma il pilota viene sempre prima. 💛' },
  { style: 'pitstop', icon: '🏁', heading: 'La curva del capitolo difficile', tag: 'CI PENSA LA SQUADRA', text: 'Quando un argomento non entra in testa, non significa che tu non sia capace. A volte si rallenta, si cambia marcia, si riprova più tardi. Nessuna penalità per una pausa: solo tifo e baci dal tuo box.' },
  { style: 'pitstop', icon: '🥇', heading: 'Premio fair play', tag: 'PODIO PERSONALE', text: 'Oggi il premio non va per forza a chi ha studiato più pagine. Va anche a chi ci ha provato, ha chiesto aiuto, si è fermata prima di esaurirsi o ha ricominciato dopo una giornata storta. Medaglia virtuale per te. 🥇' },
  { style: 'pitstop', icon: '🔧', heading: 'La moto del coraggio', tag: 'PICCOLA MANUTENZIONE', text: 'Il coraggio non è un motore che gira sempre al massimo. A volte è fare benzina con una pausa, controllare la pressione con un respiro e ripartire al proprio ritmo. Ti voglio bene, pilota del mio cuore.' },
  { style: 'pitstop', icon: '📣', heading: 'Dagli spalti, con amore', tag: 'TIFO AL 100%', text: 'Ylenia in pista! Il pubblico — composto da Fra e da un numero esagerato di cuoricini — è in piedi sugli spalti. Non importa come va questo giro: qui si applaude l’impegno, si offre acqua e si distribuiscono baci. ❤️🏁' },
  { style: 'pitstop', icon: '🧡', heading: 'Ultimo giro? Solo se vuoi', tag: 'ASCOLTA IL PILOTA', text: 'Se hai ancora energie, fai un piccolo giro di ripasso. Se sei stanca, rientra ai box senza sensi di colpa. La gara non vale più della tua salute e il traguardo non scappa. Ti aspetto con un abbraccio.' },

  // Promemoria luminosi e un po’ giocosi.
  { style: 'spark', icon: '✨', heading: 'Notifica dall’universo', text: 'L’universo ti ricorda che puoi essere in costruzione e meravigliosa nello stesso momento. Non devi aspettare di sentirti pronta al cento per cento per riconoscere quello che vali.' },
  { style: 'spark', icon: '💫', heading: 'Statistiche ufficiali', text: 'Punteggio odierno: impegno + cuore + tentativi anche quando è difficile. Risultato del calcolo: una persona di cui essere orgogliosi. La mia preferita, tra l’altro.' },
  { style: 'spark', icon: '🌟', heading: 'Piccola missione segreta', text: 'Missione: trovare una cosa che hai capito oggi, anche minuscola, e concederti il merito di averla imparata. Ricompensa aggiuntiva: un bacio da riscuotere quando vuoi.' },
  { style: 'spark', icon: '🪄', heading: 'Incantesimo anti-autocritica', text: 'Abracadabra: che il giudice severo nella tua testa abbassi il volume per un minuto. Sei una persona che sta imparando, non una macchina che deve funzionare sempre perfettamente. 💖' },
  { style: 'spark', icon: '🎈', heading: 'Lancio di complimenti', text: 'In arrivo tre complimenti non richiesti: sei dolce, sei tenace e hai una capacità tutta tua di rendere speciale anche una giornata normale. Consegnati con un abbraccio da Fra.' },
  { style: 'spark', icon: '🪐', heading: 'Promemoria cosmico', text: 'Su una scala cosmica, questo singolo paragrafo non è tutto l’universo. Fai un passo indietro, respira e torna quando vuoi. Sei una persona intera, non una lista di cose da completare.' },
  { style: 'spark', icon: '🎁', heading: 'Hai ricevuto un regalo', text: 'Hai ricevuto un regalo invisibile: il permesso di fare una pausa senza giustificarti. Usalo per bere, sgranchirti o pensare a qualcosa di bello. Scade mai? Assolutamente no.' },
  { style: 'spark', icon: '🌈', heading: 'Previsioni del cuore', text: 'Le previsioni per i prossimi minuti indicano possibilità di un respiro più leggero, una piccola conquista e un’altissima probabilità che Fra ti mandi un altro bacio. 💋' },
  { style: 'spark', icon: '🎧', heading: 'La colonna sonora', text: 'Immagina una musichetta da vittoria mentre finisci anche solo due righe. E se oggi la musica giusta fosse quella calma di una pausa? Va bene pure quella. Sei tu a scegliere il ritmo.' },
  { style: 'spark', icon: '💎', heading: 'Non dimenticare il tuo valore', text: 'Una gemma non perde valore perché è nuvoloso o perché qualcuno non la guarda. Tu non vali meno quando sei stanca, confusa o hai bisogno di ricominciare. Tienilo vicino al cuore.' },
  { style: 'spark', icon: '📮', heading: 'Posta prioritaria', text: 'È arrivata una busta urgente: contiene un bacio, una carezza sulla testa e la comunicazione che sei amata senza condizioni di rendimento. Firma qui: con tutto l’amore, Fra.' },
  { style: 'spark', icon: '🦋', heading: 'Permesso di respirare', text: 'Anche le cose belle crescono un po’ alla volta, in momenti in cui dall’esterno sembra non succedere niente. Fidati del lavoro che stai facendo, ma ricordati di lasciarti respirare.' },
  { style: 'spark', icon: '🍓', heading: 'Piccolo promemoria dolce', text: 'Sei stata bravissima a impegnarti. Ora scegli un gesto gentile per te: bere un po’ d’acqua, mangiare qualcosa quando serve o guardare lontano dallo schermo per qualche secondo. Te lo meriti.' },
  { style: 'spark', icon: '📸', heading: 'Scatta una foto mentale', text: 'Conserva questo momento come prova che stai costruendo il tuo percorso giorno per giorno. Non devi vedere subito tutto il risultato per sapere che ogni piccolo passo può contare.' },
  { style: 'spark', icon: '🧡', heading: 'Il mio colore preferito', text: 'Oggi il colore ufficiale è quello delle cose fatte con pazienza: niente fretta, niente confronti. Solo tu, il tuo ritmo e qualcuno che ti vuole un bene immenso.' },

  // Studio e cura di sé: utili, mai un rimprovero.
  { style: 'study', icon: '📚', heading: 'Mini reset da studio', tag: '30 SECONDI PER TE', text: 'Abbassa le spalle, allenta le dita, guarda un punto lontano e fai un respiro lento. Poi scegli una sola cosa da affrontare per prima. Non devi sistemare tutto adesso.' },
  { style: 'study', icon: '🧠', heading: 'Il cervello sta lavorando', tag: 'FIDATI DEL PROCESSO', text: 'Se un concetto richiede più tentativi, è normale: stai costruendo collegamenti, non fallendo una prova. Cambia esempio, fai una pausa o torna dopo. La pazienza è parte dello studio.' },
  { style: 'study', icon: '💧', heading: 'Promemoria acqua', tag: 'PICCOLA CURA', text: 'La tua squadra ti ricorda di bere un sorso d’acqua e cambiare posizione per un momento. Il benessere fa parte del percorso, non è un premio da ottenere solo a lavoro finito.' },
  { style: 'study', icon: '📝', heading: 'Una pagina non è una gara', tag: 'RITMO TUO', text: 'Non pensare a tutto il capitolo: scegli una pagina, poi una domanda, poi una pausa se serve. La strada lunga diventa più gestibile quando guardi il prossimo passo.' },
  { style: 'study', icon: '🌿', heading: 'Lascia riposare la mente', tag: 'PAUSA SENZA COLPA', text: 'A volte staccare per un minuto è più utile che rileggere la stessa frase dieci volte. Muoviti un po’, respira e torna quando ti senti pronta. Nessun senso di colpa ammesso.' },
  { style: 'study', icon: '🎯', heading: 'Un obiettivo piccolo', tag: 'UNA COSA ALLA VOLTA', text: 'Scegli una sola cosa concreta da fare adesso. Se la finisci, bene; se scopri che serve più tempo, hai comunque imparato qualcosa sul prossimo passo. Non serve strafare per progredire.' },
  { style: 'study', icon: '🫧', heading: 'Sgonfia la pressione', tag: 'NON DEVI ESSERE PERFETTA', text: 'La pressione può far sembrare enorme anche una cosa piccola. Prova a trasformare “devo sapere tutto” in “adesso capisco questo pezzo”. È una richiesta più gentile e spesso più utile.' },
  { style: 'study', icon: '🪴', heading: 'Anche la crescita è invisibile', tag: 'CONTINUA CON CALMA', text: 'Non tutte le ore di studio sembrano produttive sul momento. A volte stai consolidando, collegando o capendo cosa devi ancora chiarire. Riconosci il lavoro senza pretendere miracoli ogni giorno.' },
  { style: 'study', icon: '💡', heading: 'Cambia prospettiva', tag: 'UN ALTRO TENTATIVO', text: 'Se una spiegazione non funziona, non è un verdetto su di te. Cerca un esempio diverso, dillo a voce alta o chiediti come lo spiegheresti a un’amica. Ci sono tante strade per capire.' },
  { style: 'study', icon: '🛋️', heading: 'Il riposo fa parte del piano', tag: 'RICARICA LE BATTERIE', text: 'Il riposo non è l’opposto dell’impegno: ti aiuta a sostenerlo. Se sei arrivata al limite, concederti una pausa è una decisione sensata, non una resa.' },
  { style: 'study', icon: '🩺', heading: 'Promemoria della futura dottoressa', tag: 'PRENDITI CURA ANCHE DI TE', text: 'Stai studiando per prenderti cura delle persone: ricordati che anche tu meriti cura, gentilezza e attenzione. Nessun manuale può sostituire un po’ di ascolto verso te stessa.' },
  { style: 'study', icon: '📖', heading: 'Il prossimo piccolo passo', tag: 'BASTA INIZIARE', text: 'Apri solo il punto da cui vuoi ripartire. Non devi avere già voglia di fare tutto: qualche volta basta iniziare con poco e vedere come va. Io faccio il tifo da bordo pagina.' },
  { style: 'study', icon: '⏳', heading: 'Niente cronometri impossibili', tag: 'IL TUO TEMPO CONTA', text: 'Un confronto con i ritmi degli altri raramente racconta tutta la storia. Concentrati su ciò che ti aiuta davvero a capire e mantieni un ritmo che puoi sostenere, non soltanto sopportare.' },
  { style: 'study', icon: '🤍', heading: 'Gentilezza prima di tutto', tag: 'PARLATI BENE', text: 'Prova a parlarti come parleresti a una persona che ami e che sta facendo del suo meglio. Non le diresti che non vale abbastanza perché è stanca. Meriti la stessa gentilezza, amore.' },
  { style: 'study', icon: '✅', heading: 'Conta anche quello che hai fatto', tag: 'GUARDA I PROGRESSI', text: 'Prima di aggiungere altri compiti alla lista, nota almeno una cosa che hai già affrontato. Il cervello tende a vedere ciò che manca: oggi facciamo spazio anche a ciò che hai conquistato.' },
]

export function LoveMessages() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let recentIndexes: number[] = []
    let lastStyle: MessageStyle | null = null
    let stopped = false

    const pickMessage = (): LoveMessage => {
      const indexed = messages.map((message, index) => ({ message, index }))
      const notRecentlyShown = indexed.filter(({ index }) => !recentIndexes.includes(index))
      const variedPool = notRecentlyShown.filter(({ message }) => message.style !== lastStyle)
      const pool = variedPool.length > 0
        ? variedPool
        : notRecentlyShown.length > 0
          ? notRecentlyShown
          : indexed
      const selected = pool[Math.floor(Math.random() * pool.length)]
      recentIndexes = [...recentIndexes, selected.index].slice(-8)
      lastStyle = selected.message.style
      return selected.message
    }

    const showLove = () => {
      if (stopped) return

      const message = pickMessage()

      toast((t) => {
        const closeButton = (
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            aria-label="Chiudi messaggio"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-xs font-bold text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          >
            ✕
          </button>
        )

        if (message.style === 'simple') {
          return (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-lg" aria-hidden="true">{message.icon}</span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-semibold leading-snug text-slate-800">{message.text}</p>
                <p className="mt-1 text-[10px] text-slate-500">Un pensiero al volo · Fra ❤️</p>
              </div>
              {closeButton}
            </div>
          )
        }

        if (message.style === 'pitstop') {
          return (
            <div className="relative flex items-start gap-2.5 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-slate-700 via-sky-600 to-amber-400" />
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-lg shadow-sm" aria-hidden="true">{message.icon}</div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-extrabold tracking-tight text-slate-800 sm:text-sm">{message.heading}</p>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-amber-800">{message.tag}</span>
                </div>
                <p className="mt-1 text-[12px] leading-[1.5] text-slate-700 sm:text-[13px]">{message.text}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <span className="h-px w-5 bg-amber-400" />
                  Con amore, Fra <span aria-hidden="true">♥</span>
                </div>
              </div>
              {closeButton}
            </div>
          )
        }

        if (message.style === 'letter') {
          return (
            <div className="relative flex items-start gap-2.5 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-rose-300 via-pink-400 to-amber-200" />
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white/90 text-lg shadow-sm" aria-hidden="true">{message.icon}</div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[13px] font-extrabold tracking-tight text-rose-900 sm:text-sm">{message.heading}</p>
                <p className="mt-1 text-[12px] leading-[1.55] text-slate-700 sm:text-[13px]">{message.text}</p>
                <p className="mt-2 text-[10px] font-semibold text-rose-700">Con amore, Fra · sempre dalla tua parte</p>
              </div>
              {closeButton}
            </div>
          )
        }

        if (message.style === 'study') {
          return (
            <div className="relative flex items-start gap-2.5 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-400" />
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-white/90 text-lg shadow-sm" aria-hidden="true">{message.icon}</div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-extrabold tracking-tight text-slate-800 sm:text-sm">{message.heading}</p>
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-teal-800">{message.tag}</span>
                </div>
                <p className="mt-1 text-[12px] leading-[1.5] text-slate-700 sm:text-[13px]">{message.text}</p>
                <div className="mt-2 text-[10px] font-semibold text-teal-800">Un passo alla volta. Io sono con te. 🤍</div>
              </div>
              {closeButton}
            </div>
          )
        }

        return (
          <div className="relative flex items-start gap-2.5 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-rose-300" />
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white/90 text-lg shadow-sm" aria-hidden="true">{message.icon}</div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-[13px] font-extrabold tracking-tight text-slate-800 sm:text-sm">{message.heading}</p>
              <p className="mt-1 text-[12px] leading-[1.5] text-slate-700 sm:text-[13px]">{message.text}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-violet-700">
                <span className="h-px w-5 bg-violet-300" />
                Un pensiero speciale da Fra ✨
              </div>
            </div>
            {closeButton}
          </div>
        )
      }, {
        duration: 30000,
        position: 'top-right',
        style: {
          background: message.style === 'pitstop'
            ? 'linear-gradient(138deg, #ffffff 0%, #f0f9ff 52%, #fffbeb 100%)'
            : message.style === 'letter'
              ? 'linear-gradient(138deg, #fffafa 0%, #fff1f2 58%, #fffbeb 100%)'
              : message.style === 'study'
                ? 'linear-gradient(138deg, #ffffff 0%, #f0fdfa 56%, #eff6ff 100%)'
                : message.style === 'spark'
                  ? 'linear-gradient(138deg, #ffffff 0%, #f5f3ff 52%, #f0f9ff 100%)'
                  : '#ffffff',
          color: '#1e293b',
          border: message.style === 'pitstop' ? '1px solid #94a3b8' : message.style === 'letter' ? '1px solid #f9a8d4' : message.style === 'study' ? '1px solid #99f6e4' : message.style === 'spark' ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
          borderRadius: '18px',
          boxShadow: '0 14px 32px -16px rgba(15, 23, 42, 0.5), inset 0 0 0 2px rgba(255,255,255,0.85)',
          maxWidth: 'min(360px, calc(100vw - 24px))',
          padding: message.style === 'simple' ? '10px 12px' : '12px 13px 11px',
        },
      })

      // Primo messaggio dopo 4–10 secondi; poi una pausa casuale fra 4 e 8 minuti.
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
