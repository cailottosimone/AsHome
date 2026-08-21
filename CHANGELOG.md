# Changelog

Ogni consegna aggiorna questo file e la costante `APP_VERSION` in
`js/config.js` (mostrata in piccolo nell'interfaccia, in alto a destra
nella barra condivisa). Versionamento semplice: **major** per cambi
strutturali/di modello dati, **minor** per nuove funzionalità, **patch**
per correzioni.

## v2.2.0

- **Le categorie di un template ora sopravvivono nel piano.** Prima,
  compilare un piano da un template apriva un "wizard" che chiedeva
  subito di scegliere un alimento per ogni categoria — inutile e
  rotto. Ora compilare da template porta nel piano la STRUTTURA a
  categorie (es. "Lunedì Pranzo" → sezioni Carboidrati + Verdura); si
  riempiono con calma dalla vista Piano, dove ogni sezione ha il
  proprio "+" che propone solo gli alimenti della dispensa compatibili
  con quella categoria. Nuova tabella `piano_pasto_categorie`
  (migrations/011) e colonna `categoria_id` su `piano_pasto_alimenti`.
  Comportamento non distruttivo: eliminare una categoria toglie la
  sezione ma non gli alimenti già inseriti.
- **"Template" ha una sua sotto-vista dedicata**, non più annidata in
  Impostazioni — Impostazioni ora contiene solo le categorie.
- **Revisione grafica completa**: un solo colore primario (indigo) in
  entrambe le app, non più tre in competizione (indigo/teal/verde
  acceso). I colori "semantici" (verde per Spesa Finita, ambra per
  suggerimenti/Manca, rosso per eliminare) restano, ma solo dove il
  loro significato è reale — non come decorazione. Intestazioni delle
  due app rese identiche nella struttura: titolo, sottotitolo sotto
  (mai a fianco), poi azioni o tab.

## v2.1.1

- **Bug corretto — costruttore di template bloccato**: `state.tipiPasto`
  non veniva mai popolato (mancava la chiamata a `fetchTipiPasto()`),
  quindi il selettore "+ pasto" non aveva mai opzioni da mostrare per
  nessun giorno — il template restava vuoto, senza modo di aggiungere
  pasti. Aggiunto `ricaricaTipiPasto()` al caricamento iniziale.
- **Navigazione resa coerente tra i due livelli**: sia lo switcher
  Lista Spesa/Piano Alimentare sia le sotto-viste del Piano Alimentare
  (Piano/Dispensa/Cosa mi manca/Impostazioni) usano ora lo stesso
  linguaggio — tab con sottolineatura — al posto delle pill, più
  leggibili e prevedibili su desktop.
- **Barra azioni del Piano semplificata**: i cinque elementi ambigui
  in fila ("+ Vuoto", "Da template", "Da prec.", "Nuovo template",
  cestino) diventano un selettore piano + un unico bottone "Nuovo
  piano" che apre un menu con le tre modalità di creazione, ciascuna
  spiegata in una riga.
- **"Nuovo template" spostato in Impostazioni**, accanto all'elenco
  dei propri template — stava vicino a "Da template" nella vecchia
  barra e si confondeva facilmente con quello (creare un template
  nuovo vs usarne uno esistente per un piano sono due azioni diverse).

## v2.1.0

- **Lista Spesa e Piano Alimentare ora sono due app pari**, non più
  una dentro l'altra: uno switcher condiviso in cima le mette allo
  stesso livello, ciascuna con la propria identità visiva (indigo /
  teal). Menu account e numero di versione vivono nella barra
  condivisa, non più duplicati.
- **"Cosa mi manca" ridisegnato**: niente più checkbox ambigua. Ogni
  alimento ha due azioni esplicite — **Manca** (apre il normale
  modale "Nuovo Prodotto": quantità, negozio, note, categoria, come
  ovunque nella lista) e **Ce l'ho** (sparisce e basta). Rimosso il
  vecchio bottone cumulativo "Aggiungi mancanti", non più necessario.
- **Impostazioni** (nuova sotto-vista del Piano Alimentare): le
  categorie alimento si aggiungono ed eliminano da qui, non solo
  seedate via migrazione; elenco dei propri template con eliminazione.
  Nuova migrazione `010_categorie_gestibili.sql` (policy update/delete).
- **Creazione template finalmente raggiungibile**: nuovo costruttore
  ("Piano" → "Nuovo template") — si dà un nome, poi si aggiungono
  pasti e categorie attese giorno per giorno, con scrittura immediata
  come nel resto dell'app.
- Selettore categorie ridisegnato come chip cliccabili (non più
  checkbox dentro pillole).
- Dispensa raggruppata per categoria (un alimento in più categorie
  compare in più gruppi), spaziature più contenute.
- Griglia del Piano più compatta in altezza (padding e margini ridotti).
- Prima versione mostrata nell'interfaccia; introdotto questo changelog.

## v2.0.0

- **Autenticazione** (prima assente): login via magic link, Supabase
  Auth nativo.
- **Case**: la lista condivisa diventa multi-Casa. Si crea una Casa o
  ci si unisce con un codice invito; lista, dispensa, piani e storico
  sono condivisi tra i membri della stessa Casa.
- **Piano Alimentare**: dispensa, piani settimanali (giorni → pasti →
  alimenti), template (categorie attese per pasto), "Cosa mi manca"
  collegato alla lista della spesa esistente.
- Migrazioni `003`-`009`. La `003` svuota `lista_spesa` e
  `suggerimenti_ignorati` esistenti (deciso: si riparte puliti).
- Bug di RLS trovato e corretto durante i test: l'id di una Casa va
  generato lato client, non riletto dopo l'INSERT.

## v1.1.0

- **"Potresti aver bisogno di"**: suggerimenti d'acquisto ricorrenti
  calcolati dallo storico (intervallo medio, regolarità), nessuna AI.
  "Non ora" (snooze) / "Non suggerire più" (dismiss permanente).

## v1.0.0

- Riscrittura da singolo `index.html` a repository modulare
  (`api.js`/`state.js`/`ui.js`/`app.js`), stessa funzionalità di lista
  della spesa condivisa via Supabase.
