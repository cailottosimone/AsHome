# Changelog

Ogni consegna aggiorna questo file e la costante `APP_VERSION` in
`js/config.js` (mostrata in piccolo nell'interfaccia, in alto a destra
nella barra condivisa). Versionamento semplice: **major** per cambi
strutturali/di modello dati, **minor** per nuove funzionalità, **patch**
per correzioni. Il nome del file di consegna include sempre la
versione (es. `AsHome-v3.3.0.zip`).

## v3.3.0

Correzioni dirette dopo il primo giro di prova reale della v3.2.0.

- **Navigazione: sidebar via su desktop.** Ingombrante per due sole
  voci. Torna una barra sottile in cima con le due app inline (come
  nelle immagini di riferimento), invariata dentro; il drawer con
  hamburger resta, ma solo su mobile, dove risolve davvero un problema
  di spazio.
- **Header di Lista Spesa e Piano Alimentare resi identici**: stessa
  dimensione del titolo, stessa struttura. Via i due sottotitoli
  ("La lista della spesa condivisa..." e "Cosa mangiare questa
  settimana...") — pulizia richiesta esplicitamente.
- **Card giorno ridisegnata**: badge a sinistra con il nome breve
  piccolo sopra ("LUN") e il numero grande sotto ("18"), non più una
  singola riga di testo in alto.
- **Range di date**: sempre "D MESE - D MESE" (es. "31 LUG - 6 AGO",
  "10 LUG - 16 LUG"), mai raggruppato anche se stesso mese — stesso
  comportamento in ogni caso, come richiesto esplicitamente. Frecce
  vicine al testo, non più a estremità di una riga intera.
- **"Cosa mi manca" da sotto-vista a bottone azione** nel Piano
  (con badge numerico), che apre un modale — la sotto-vista aveva 4
  tab, ora 3.
- **"Da un template" e "Dalla settimana precedente"** raggruppati
  sotto un unico bottone "Compila da...", che li propone entrambi —
  comportamento di ciascuno invariato.
- **Bottone "Elimina" reso compatto**, solo icona, rispetto ai bottoni
  con testo nella stessa riga.

## v3.2.0

Revisione della navigazione e della densità d'uso, dopo il primo giro
di prova reale da mobile.

- **Navigazione ripensata**: sidebar scura con Lista Spesa e Piano
  Alimentare, persistente su desktop, a scomparsa su mobile dietro un
  hamburger (con overlay). Impostazioni non è più una terza voce di
  navigazione: è un'icona accanto all'account nella barra in alto,
  concettualmente separata dalle due app pari.
- **Desktop: contenuto molto più largo** (da `max-w-3xl` a `max-w-7xl`
  ovunque) — niente più colonna centrale stretta su schermi larghi.
- **Settimana: di nuovo un giorno per riga**, con il numero del giorno
  in etichetta (es. "LUN 18", "MAR 19" — nuova `etichettaGiorno()` in
  `date-utils.js`), non solo il nome. Pranzo e Cena restano affiancati
  dentro la riga.
- **Categorie richiudibili**, compresse di default: in Dispensa (per
  ogni categoria, con `<details>` nativo) e in Impostazioni (per ogni
  sezione — Categorie alimenti, Supermercati — con il bottone "+" reso
  innocuo rispetto al toggle nativo tramite `preventDefault()`).
- **Dispensa: categoria obbligatoria, scelta da modale** — via le pill
  sempre visibili; ora un piccolo bottone accanto al campo nome apre
  un modale con l'elenco (stesso pattern già usato altrove), e salvare
  senza aver scelto almeno una categoria non è più permesso.
- **Pulsante "Svuota settimana"**: non più isolato e minuscolo se va a
  capo su schermi stretti — stessa regola flessibile degli altri due
  bottoni della riga, si allarga da solo se resta l'unico sulla riga.

## v3.1.0

- **Impostazioni diventa una sezione globale**: terza voce nella barra
  condivisa, alla pari di Lista Spesa e Piano Alimentare — non più
  annidata solo nel Piano Alimentare. Le categorie alimento si sono
  spostate lì; il Piano Alimentare continua a leggerle dove servono
  (dispensa, template, filtro nel compilatore pasto), semplicemente
  non le gestisce più in una vista propria.
- **Supermercati**, nuova sezione in Impostazioni: a differenza delle
  categorie alimento (condivise tra tutte le Case), sono **specifici
  per Casa** — validato via SQL diretto: due Case diverse possono
  avere lo stesso nome di supermercato senza conflitti, la RLS isola
  correttamente tra Case. Alimentano un suggerimento (datalist) sul
  campo "Negozio" della Lista Spesa, senza obbligare a usarli: il
  campo resta testo libero.

## v3.0.0

Cambio strutturale concordato: il "piano" con nome libero, da scegliere
da un elenco, non esiste più. Il piano **è** la settimana stessa.

- **Calendario a settimane.** Si naviga di settimana in settimana con
  due frecce (prev/next) sopra un range di date reale ("18 – 24 Agosto
  2026"). Ogni settimana è identificata dalla data del suo lunedì
  (`piani.data_inizio`, vincolo unico per Casa — migrations/012). Non
  c'è più un "piano vuoto" da creare: la griglia dei 7 giorni è sempre
  lì, pronta da riempire toccando un pasto qualsiasi — la riga in
  database si crea da sola, in modo trasparente, alla prima interazione
  reale su quella settimana.
- **Template e "Dalla settimana precedente" restano slegati e non
  vincolanti.** Applicare un template o copiare dalla settimana
  precedente è un **merge**, non una sostituzione: categorie e alimenti
  già inseriti a mano non vengono toccati, si aggiunge solo ciò che
  manca (verificato: applicare due volte lo stesso template non crea
  doppioni). "Dalla settimana precedente" individua da sé l'ultima
  settimana popolata, anche se non è quella immediatamente precedente.
- **Riepilogo categorie**: nella sidebar (sopra la griglia su mobile,
  a fianco su schermi larghi) quante volte è usata ogni categoria
  questa settimana — resta visibile anche su mobile perché utile.
- **Filtro per categoria** nel form di compilazione di un pasto, oltre
  alla ricerca testuale: una piccola icona apre un elenco di categorie
  da spuntare, per ispirarsi ("quale carne mangio quel giorno?").
- ⚠️ **Reset dei piani esistenti**: la migrazione 012 svuota la
  tabella `piani` (e tutto ciò che ne dipende: giorni, pasti,
  checklist) — non si adattano al nuovo modello a settimane, stesso
  approccio già seguito per il passaggio al modello a Case.

## v2.5.0

- **Accesso con email e password**, in aggiunta al magic link (non lo
  sostituisce). Due schede nella schermata di accesso; il blocco
  password ha anche la registrazione, con gestione del caso in cui
  Supabase richieda una conferma via email prima di poter accedere.
  Risolve anche l'attrito del rate limit sulle email quando si accede
  spesso.
- **"Cosa mi manca" a due fasi.** Prima si segna ogni alimento come
  *Manca* o *Ce l'ho* (tocchi rapidi, nessun popup); poi un solo
  bottone "Invia alla lista" apre in sequenza — uno dopo l'altro — il
  modulo di inserimento (quantità, negozio, note) per ogni alimento
  segnato mancante, e in parallelo elimina in blocco quelli segnati
  "Ce l'ho". Se si annulla un popup a metà sequenza, quanto resta da
  processare rimane segnato per un invio successivo.
- **Il piano da template non è più vincolante**: nel form di
  compilazione di un pasto, oltre alle categorie previste dal
  template, c'è sempre una sezione "Altro" per aggiungere qualcosa
  fuori da quelle categorie — un'azione esplicita e distinta, non
  nascosta né confusa con le sezioni previste.
- **Casella di ricerca** nel form di compilazione di un pasto, per
  trovare rapidamente un alimento tra quelli disponibili.
- **Categorie senza emoji**, filtri per negozio senza icone — solo
  testo, più sobrio.

## v2.4.1

Correzioni dirette dopo il primo uso reale delle card compatte
introdotte in v2.4.0.

- **Menu del piano: tornato a controlli separati.** Il tentativo di
  consolidare switch/rinomina/elimina/nuovo in un solo menu si è
  rivelato meno usabile di prima, non di più. Ora: uno switcher
  dedicato solo a passare da un piano all'altro, due bottoni distinti
  per rinominare ed eliminare (icona + testo su schermi larghi), un
  bottone "+ Nuovo piano" separato con il proprio menu per le tre
  modalità di creazione — ciascun controllo fa una cosa sola, chiara.
- **Griglia: massimo 2 card per riga**, non più 3 su schermi larghi —
  a 3 il testo diventava illeggibile.
- **Card senza etichetta di categoria quando è compilata**: se una
  sezione ha alimenti, si vedono solo i nomi (es. "Pasta, Riso"); se è
  ancora vuota, resta il nome della categoria come promemoria di cosa
  manca pianificare (es. "Verdura").
- **Dimensioni aumentate**, in particolare su schermi grandi: nav
  condivisa, sotto-nav del Piano Alimentare, contenuto delle card e
  del form di compilazione pasto. La densità restava quella richiesta
  in v2.4.0, ma il testo era diventato illeggibile su desktop.

## v2.4.0

- **Bug corretto — magic link puntava a `localhost`.** Il redirect via
  email era preso da `window.location.origin`, cioè da dove girava
  l'app nel momento della richiesta (Live Server = localhost): il link
  ricevuto via mail su un altro dispositivo non portava da nessuna
  parte. Aggiunta `APP_URL` (config.js), un indirizzo fisso e pubblico
  da configurare una volta; nuova sezione nel README con i passi per
  ottenerne uno gratis (GitHub Pages) e per configurare le Redirect
  URL lato Supabase. Finché non è impostata, il comportamento resta
  quello di prima (utile in sviluppo sullo stesso dispositivo).
- **Griglia del piano molto più compatta.** Ogni pasto è ora una card
  piccola che mostra solo gli alimenti scelti; Pranzo e Cena stanno
  affiancati dentro lo stesso giorno invece che impilati, e più giorni
  stanno affiancati su schermi larghi — stessa densità di
  informazione, una frazione dello spazio.
- **Un solo form per compilare un pasto.** Toccando la card di un
  pasto si apre un unico form con tutte le sue categorie insieme
  (divise visivamente, ma senza riaprire un modale per ognuna):
  alimenti già scelti come chip rimovibili, alimenti disponibili in
  elenco subito sotto, un tocco per aggiungerli.
- **Menu del piano unificato.** Il selettore nativo più tre controlli
  separati (nuovo/rinomina/elimina) diventano un solo pulsante che
  apre un menu con tutto: elenco piani su cui passare, rinomina,
  elimina, nuovo piano con le sue tre modalità.
- **Categorie in Impostazioni in elenco tabellare**, non più pillole
  minuscole sotto un campo di testo enorme — stesso formato già usato
  per l'elenco dei Template, per coerenza. L'aggiunta di una nuova
  categoria passa da un piccolo pulsante "+ Nuova", non più un input a
  piena larghezza sempre visibile per un'azione occasionale.

## v2.3.0

Round di correzioni funzionali dopo un giro di verifica da desktop
(la revisione grafica completa, segnalata come necessaria a parte,
resta un intervento separato non ancora affrontato).

- **Template modificabile.** Prima si poteva solo crearne uno nuovo o
  eliminarlo: ora si tocca un template esistente nell'elenco e si
  riapre lo stesso costruttore, con la struttura già caricata — nome
  compreso. Confermato via test diretto: rinominare o cambiare le
  categorie di un template non tocca in alcun modo i piani già creati
  da esso (nessun riferimento tra le due entità, il piano ne è una
  copia indipendente fin dall'inizio).
- **Pranzo e Cena sempre presenti nel template**, non più da
  aggiungere uno a uno per ciascuno dei 7 giorni (14 pressioni di un
  selettore). `createTemplate()` ora pre-crea la struttura intera,
  esattamente come già faceva per i piani — se non ci si mette
  nessuna categoria, quel pasto resta semplicemente "non pianificato".
- **Selezione multipla ovunque serviva**: le categorie di un pasto nel
  template si scelgono tutte insieme (checkbox + un solo "Aggiungi"),
  non più una alla volta con il modale che si chiude e riapre. Stesso
  discorso per gli alimenti da aggiungere a un pasto del piano.
- **Tutto ciò che si crea si può modificare**: piano e template si
  rinominano (icona penna); un alimento in dispensa si modifica per
  intero (nome e categorie), riusando lo stesso id — se correggi un
  refuso lo storico nei piani resta intatto, non serve eliminare e
  ricreare da capo. Verificato concretamente: un alimento già presente
  in un piano, rinominato, continua a comparire correttamente col
  nome nuovo nello stesso punto del piano.
- **Scelta alimenti per un pasto "libero"** (piano creato vuoto, senza
  sezioni-categoria): ora raggruppata per categoria, filtrabile con un
  campo di ricerca, e multi-selezione in un solo giro invece che un
  alimento alla volta.

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
