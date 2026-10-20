# AI Studio: fallback dei modelli

MedicalDocs usa la route server-side `/api/ai`. Le chiavi devono restare variabili server-only in Vercel: non usare prefissi `NEXT_PUBLIC_` e non inserirle nel repository.

## Provider principale Groq

Configurazione esistente compatibile:
- `AI_API_KEY` (oppure `GROQ_API_KEY`) contiene la chiave Groq.
- `AI_BASE_URL=https://api.groq.com/openai/v1` quando si usa la coppia legacy `AI_API_KEY` / `AI_MODEL`.
- `AI_MODEL=openai/gpt-oss-120b` (ID API esatto).

Attiva i tentativi automatici con `AI_FAILOVER_ENABLED=true`. Quando il 120B fallisce per un errore recuperabile, la route prova `openai/gpt-oss-20b` come riserva predefinita. `GROQ_MODEL_FALLBACK_1` può sostituire il modello di riserva, ma va impostato solo su un ID attivo e con quota/costo verificati per il proprio account.

Se il provider segnala esaurimento globale della quota o dei crediti, la route salta gli altri modelli dello stesso provider e passa al successivo provider configurato. Cambiare dal 120B al 20B non garantisce che la quota condivisa dell'account sia ancora disponibile.

## Gemini come provider indipendente (opt-in)

Gemini non viene attivato soltanto dalla presenza della chiave. Servono entrambe queste condizioni:
- `GEMINI_API_KEY` in Vercel.
- `AI_GEMINI_FALLBACK_ENABLED=true`, oltre a `AI_FAILOVER_ENABLED=true`.

Base URL predefinito: `https://generativelanguage.googleapis.com/v1beta/openai`.
Modello predefinito: `gemini-3.8-flash`, configurabile con `GEMINI_MODEL_PRIMARY`. È possibile specificare `GEMINI_MODEL_FALLBACK` se si è verificato che sia utilizzabile nel proprio piano gratuito.

**Attenzione privacy:** la documentazione di Google dichiara che nel piano gratuito i contenuti possono essere usati per migliorare i prodotti Google. Non abilitare questo fallback per documenti riservati o dati personali/sanitari identificabili senza aver valutato le condizioni del provider, gli obblighi applicabili e l'eventuale consenso necessario. Lasciando `AI_GEMINI_FALLBACK_ENABLED` assente o diverso da `true`, MedicalDocs non invia automaticamente documenti a Gemini.

## Limiti e diagnostica

- La route AI può durare fino a 60 secondi; il budget applicativo è di circa 55 secondi, con timeout massimo di 32 secondi per singolo provider/modello.
- I documenti fino a 80.000 caratteri sono accettati senza taglio silenzioso. Oltre il limite viene chiesto di dividerli in sezioni per non riassumere solo una parte della fonte.
- Per testi lunghi la risposta ha un limite di output più prudente, così la richiesta rimane più gestibile con i limiti di token del provider.
- `401/403`: salta il provider con credenziali/permessi non validi e passa a un provider diverso.
- Modello non trovato / `404`: passa al modello successivo; un endpoint errato viene saltato per quel provider.
- `429` con quota globale esaurita: passa al provider successivo senza provare inutilmente altri modelli dello stesso account.
- `400` relativo al payload comune: non esegue retry ciechi.
- I log contengono solo provider, modello, stato e codice d'errore; non includono chiavi, prompt o testo del documento.
- L'estrazione del testo dall'editor conserva separazioni fra paragrafi, titoli, elenchi e interruzioni di riga.
- Il prompt chiede esplicitamente italiano corretto, struttura in Markdown, paragrafi separati e liste leggibili.
- Il failover aumenta la probabilità di ottenere una risposta, ma non può garantire disponibilità se tutti i provider e le quote sono esauriti.

Per il sito pubblico, impostare le variabili nel progetto Vercel corretto (`medical-docs`, non `medical-docs-b1f6`) e negli ambienti necessari. Non è necessario incollare chiavi in chat.