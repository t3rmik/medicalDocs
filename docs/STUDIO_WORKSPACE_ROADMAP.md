# MedicalDocs Pro — piano miglioramenti

Questo piano è diviso in blocchi piccoli: ogni blocco deve passare la build e una verifica funzionale prima di procedere oltre. Le funzionalità non contrassegnate come completate sono ancora da implementare.

## Prima tranche: pagine reali e tabelle

- [x] AI Studio: rimuovere la suddivisione fittizia del testo in "sezioni/pagine stimate".
- [x] AI Studio: usare i marcatori delle pagine dei PDF importati, le interruzioni manuali e le pagine della paginazione attiva dell'editor.
- [x] AI Studio: mostrare un messaggio esplicito quando non è possibile rilevare più pagine reali.
- [x] Tabelle: controlli per spostare la tabella prima/dopo il blocco vicino.
- [x] Tabelle: riduzione/aumento della larghezza, ripristino larghezza pagina e allineamento.
- [x] Tabelle: densità compatta/normale/ampia, aggiunta righe/colonne sopra o sotto, intestazione, unione/divisione celle.
- [ ] Tabelle: handle diretto trascinabile per spostamento libero e ridimensionamento con mouse/stilo; verificare comportamento su tablet e pagine spezzate.
- [ ] Tabelle: controllo puntuale dell'altezza delle righe e stile di bordi/colori.

## Stabilità e integrità dei documenti

- [ ] Test di regressione su cambio rapido documento, autosalvataggio, immagini grandi e recupero da errore dell'editor.
- [ ] Cronologia versioni con ripristino e anteprima delle modifiche.
- [ ] Backup/ripristino della libreria documenti, con verifica d'integrità prima dell'importazione.
- [ ] Test automatici per esportazione PDF/Word: interruzioni pagina, Calibri, tabelle, immagini, formule e numeri pagina.
- [ ] Conferma chiara del salvataggio e avviso prima di chiudere quando un salvataggio è ancora in corso.

## Modalità Studio

- [ ] Flashcard generate dagli appunti con ripetizione dilazionata e andamento dei ripassi.
- [ ] Quiz con correzione, spiegazione degli errori e registro degli argomenti da ripassare.
- [ ] Piano di studio per materia, obiettivi settimanali e sessioni completate.
- [ ] Mappe concettuali modificabili, con nodi e collegamenti spostabili.
- [ ] AI sul testo selezionato/pagina reale/argomenti scelti, con modello utilizzato sempre visibile e distinzione tra fonte e integrazioni.

## Produttività e navigazione

- [ ] Ricerca globale in titoli e contenuto con salti al risultato nel documento.
- [ ] Miniature pagine, navigazione pagina precedente/successiva e riordino pagine controllato.
- [ ] Barra contestuale per testo, immagini, formule e tabelle, con scorciatoie configurabili.
- [ ] Migliorie a penna: selezione lasso, spostamento dei tratti, forme/frecce e gomma più precisa.
- [ ] Esportazione/importazione semplice per trasferire documenti tra PC e tablet; sincronizzazione cloud solo se richiesta e con controlli di privacy.

## Criterio di rilascio

Non promuovere in produzione finché la build non è Ready e i test manuali di base non sono completati. Evitare redeploy ripetuti: un solo deployment per ogni blocco verificato.
