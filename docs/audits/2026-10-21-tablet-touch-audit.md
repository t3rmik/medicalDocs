# MedicalDocs Pro — audit generale e collaudo tablet/penna

Data: 21 ottobre 2026
Base verificata: release consolidata be87de900247fd6d1b91ea02dc01f6c785465dd8, deployment di produzione READY.

## Ambito dell'audit
Revisione statica di Next.js/React, editor TipTap, salvataggio locale Dexie, ricerca documenti, ribbon, import/export, AI Studio, PDF.js, OCR Tesseract, PDF-Lib, annotazioni, miniature pagine, immagini ridimensionabili, CSS responsive e controlli accessibili.

Questo controllo trova rischi nel codice ma non sostituisce una prova reale in browser. Non ho avuto accesso a un tablet fisico o alla penna della studentessa, perciò i risultati del puntatore e la palm rejection del produttore restano da verificare sul dispositivo.

## Correzioni incluse nel lotto audit

### Alta priorità: touch e stilo PDF
- La modalità Penna PDF accetta ora la penna attiva per impostazione predefinita; il dito continua a scorrere. Il disegno col dito è opt-in con il controllo "Disegna col dito".
- Gli eventi di disegno raccolgono i punti in una ref e aggiornano l'anteprima al massimo una volta per frame, invece di ricostruire l'intero array a ogni pointermove.
- Le gesture PDF annullate o interrotte vengono pulite invece di essere salvate come linee parziali. Se viene annullato un trascinamento di annotazione, lo stato originale viene ripristinato.
- Selezione testo PDF, disegno e trascinamento delle annotazioni tengono conto del pointerId. Lo scroll accidentale durante una selezione touch elimina anche lo stato della gesture.
- La pressione dello stilo viene memorizzata per segmento quando il browser espone il valore; anteprima ed esportazione PDF possono quindi variare lo spessore per tratto. Mouse e dito restano uniformi. Non tutti gli stili o browser espongono dati di pressione.
- Le azioni di cancellazione delle annotazioni sono visibili sui dispositivi touch, con target più grandi, e non devono iniziare un trascinamento quando vengono toccate.
- Il rendering PDF.js conserva il task attivo e lo cancella nel cleanup quando cambiano pagina, zoom o contenuto, evitando rendering concorrenti sullo stesso canvas.
- Il PDF si apre adattando la larghezza iniziale all'area disponibile, entro limiti di zoom sensati.

### Alta priorità: editor scritto a penna
- La modalità di selezione dei tratti riserva il gesto al movimento/ridimensionamento, senza lasciare che il browser lo trasformi in scroll della pagina.
- Un gesture annullata o che perde il pointer capture viene eliminata senza salvare un movimento o una scrittura incompleta.
- Il tratto dello stilo mantiene i segmenti con spessore variabile in base alla pressione, se disponibile; i dati legacy senza segmenti vengono ancora visualizzati.
- Il ridimensionamento delle immagini torna alla dimensione originale se il browser annulla il gesto.
- La ricerca documenti usa ricerca differita e risultati memoizzati per evitare che l'estrazione HTML di ogni documento pesi su ogni singola battuta.

### Estetica e accessibilità
- Sono coerenti il tema premium, i target touch, gli stati selezionati e le etichette accessibili introdotte nel redesign.
- La navigazione PDF usa miniature a rendering differito ed è disposta verticalmente sugli schermi più larghi e orizzontalmente su telefono.
- I controlli che cambiano modalità espongono lo stato selezionato attraverso aria-pressed dove applicabile.

## Collaudo che resta necessario su tablet reale
1. In orientamento verticale e orizzontale, aprire e scorrere note lunghe; cambiare rapidamente documento e verificare che il salvataggio non perda testo.
2. Nell'editor, provare penna, evidenziatore, gomma, selezione, trascinamento e ridimensionamento di tratti e immagini; fare un gesto e interromperlo sollevando la penna, cambiando app o lasciando intervenire il sistema.
3. Nel PDF, lasciare la modalità predefinita: scrivere con lo stilo e scorrere con il dito. Poi abilitare "Disegna col dito", verificare il tratto e disabilitarlo per tornare allo scroll.
4. Con tastiera virtuale aperta, provare il campo di sostituzione testo, la domanda AI, zoom, miniature, cambio pagina e pulsanti di annullamento/ripristino.
5. Testare PDF di 1, 30 e oltre 100 pagine: anteprime, cambio pagina, scorrimento, zoom, OCR, annotazioni, export e consumo memoria.
6. Esportare PDF con disegni, evidenziazioni, testo aggiunto e testo sostituito; confrontare il file scaricato con l'anteprima e verificare gli orientamenti.
7. Verificare tastiera, focus visibile, zoom browser al 200% e contrasto dei pannelli.

## Limitazioni che vanno comunicate
- La sostituzione del testo PDF è un overlay: il contenuto originale può restare incorporato. Copertura visiva non equivale a redazione sicura.
- OCR e AI possono sbagliare; ogni testo suggerito va riletto.
- La pressione è disponibile solo se il dispositivo e il browser la comunicano. Il codice non può garantire palm rejection; questa dipende anche dall'hardware e dal sistema operativo.
- La nuova esperienza penna non va dichiarata collaudata finché non viene provata fisicamente sulla combinazione tablet/browser/stilo usata dalla studentessa.

## Stato verifiche
- Ispezione statica del codice: eseguita.
- Controllo import e riferimenti: eseguito sul lotto di modifiche.
- Build Vercel del commit audit: in attesa.
- Test interattivo in browser: non eseguito in questa sessione.
- Test fisico tablet/penna: da eseguire.
- Promozione in produzione: non automatica; il lotto va mantenuto in preview fino a build READY e collaudo pratico.

## Criteri di accettazione
- Il dito scorre il PDF senza lasciare tratti nella modalità predefinita.
- La penna scrive senza avviare lo scroll della pagina.
- Pointer cancel e perdita di pointer capture non salvano gesture parziali.
- Il tocco sui controlli elimina non trascina l'annotazione sottostante.
- Un PDF lungo non avvia tutti i rendering delle miniature contemporaneamente.
- Il cambio rapido di documento non perde testo salvato.
- Anteprima e PDF esportato sono confrontati; il testo coperto non è presentato come rimosso in modo sicuro.
