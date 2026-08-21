# AsHome

**v2.4.1** — vedi `CHANGELOG.md` per lo storico delle versioni. La
versione corrente è mostrata anche nell'interfaccia (angolo in alto a
destra della barra condivisa).

Due app di casa condivisa, allo stesso livello, che si parlano ma
restano concettualmente separate:

- **Lista Spesa**: la lista della spesa in tempo reale, che impara le
  abitudini d'acquisto della Casa.
- **Piano Alimentare**: cosa mangiare durante la settimana, da cui
  deriva cosa comprare.

Pensata per essere usata da più persone della stessa Casa, su
dispositivi diversi, sincronizzata in tempo reale.

## Due app pari, non una dentro l'altra

Una barra condivisa in cima permette di passare dall'una all'altra con
un tap — non è un "apri/chiudi", sono due sezioni sullo stesso piano.
Un solo colore primario (indigo) attraversa entrambe: non hanno
un'identità cromatica separata, si riconoscono da icona e titolo. I
colori "semantici" (verde per confermare, ambra per ciò che richiede
una decisione, rosso per eliminare) restano gli stessi ovunque, usati
solo dove il loro significato è reale. Nella barra condivisa vivono
anche il menu account (Casa corrente, codice invito, logout) e il
numero di versione, perché non appartengono specificamente a nessuna
delle due app.

Le due app comunicano solo attraverso un punto esplicito: quando in
"Cosa mi manca" si segna un alimento come mancante, il Piano
Alimentare apre il normale modale "Nuovo Prodotto" della Lista Spesa
(stessa funzione usata ovunque, `apriModaleNuovoProdotto()` esportata
da `app.js`) — nessuna delle due legge o scrive mai direttamente lo
stato interno dell'altra.

## Funzionalità

**Lista della spesa**
- Lista attiva raggruppata automaticamente per categoria.
- Filtro per negozio, generato dinamicamente dai negozi già usati.
- Aggiunta/modifica prodotto con quantità, negozio e note libere.
- **"Spesa Finita"**: archivia in un colpo solo tutti gli articoli
  spuntati, con data e ora. Storico consultabile, ripristinabile o
  svuotabile.
- **"Potresti aver bisogno di"**: la lista impara le abitudini
  d'acquisto della Casa e propone da sola i prodotti che ricomprate
  con regolarità (es. *"Lo compri circa ogni 18 giorni"*) — vedi la
  sezione dedicata più sotto.

**Piano Alimentare**
- **Piano**: giorni → pasti (Pranzo/Cena, estendibile) → alimenti
  previsti, mostrati come card compatte (Pranzo e Cena affiancati
  dentro ogni giorno, al massimo 2 giorni per riga anche su schermi
  larghi — oltre, il testo diventa illeggibile). Una card mostra solo
  i nomi degli alimenti scelti; se una categoria è ancora vuota, resta
  il suo nome come promemoria di cosa manca. Più piani per Casa: uno
  switcher dedicato per passare da un piano all'altro, bottoni
  separati per rinominare/eliminare quello corrente, un bottone
  distinto "+ Nuovo piano" con le tre modalità di creazione (vuoto, da
  un **template**, dalla settimana precedente).
- Si tocca la card di un pasto per aprire **un solo form** con tutte
  le sue categorie insieme (divise visivamente, mai un modale per
  categoria): alimenti già scelti come chip rimovibili, disponibili
  compatibili subito sotto, un tocco per aggiungerli.
- Compilare da template porta nel piano le **categorie attese per
  pasto** (es. Lunedì Pranzo → sezioni Carboidrati + Verdura): si
  riempiono con calma dallo stesso form, non tutto insieme al momento
  della compilazione.
- **Dispensa**: cosa la Casa mangia normalmente (non un inventario di
  cosa c'è fisicamente in questo momento), raggruppata per categoria —
  un alimento in più categorie compare in ogni gruppo pertinente. Ogni
  alimento si può modificare per intero (nome e categorie): correggere
  un refuso non richiede eliminare e ricreare, lo storico nei piani
  resta intatto perché l'id non cambia.
- **Template** (sotto-vista propria): Pranzo e Cena esistono sempre
  per ogni giorno — non c'è nulla da aggiungere pasto per pasto, si
  scelgono solo le categorie attese dove si vuole pianificare
  qualcosa (multi-selezione in un solo passaggio). Un template
  esistente si tocca per riaprirlo e modificarlo: rinominarlo o
  cambiarne le categorie non tocca in alcun modo i piani già creati da
  esso, che ne restano una copia indipendente.
- **Cosa mi manca**: per ogni alimento previsto nel piano, due azioni
  esplicite — **Manca** (apre il normale modale "Nuovo Prodotto":
  stesso flusso di sempre, quantità/negozio/note/categoria) o **Ce
  l'ho** (sparisce, nessun'altra azione). Nessuna checkbox ambigua da
  interpretare.
- **Impostazioni**: le categorie alimento (condivise tra tutte le
  Case) sono un elenco, non pillole — si aggiungono con "+ Nuova", si
  eliminano riga per riga.
- Nessuna AI generativa, nessuna quantità/calorie/ricette: tutto deriva
  da categorie, relazioni tra dati e scelte esplicite.

**Casa e accesso**
- Login via **magic link** (email, nessuna password).
- Ogni Casa raggruppa lista, dispensa, piani e storico di chi ne fa
  parte; si crea una Casa o ci si unisce a quella di qualcuno con un
  codice invito.
- **Sincronizzazione realtime** su tutto: se due persone della stessa
  Casa aprono l'app da due dispositivi diversi, ogni modifica compare
  subito su entrambi.
- Interfaccia mobile-first, con pulsante flottante (FAB) su telefono e
  barra azioni completa su desktop.

## Stack

- HTML + [Tailwind CSS](https://tailwindcss.com) via CDN (nessuna build
  richiesta)
- JavaScript vanilla, organizzato in moduli ES (`type="module"`)
- [Supabase](https://supabase.com) per database Postgres, Auth
  (magic link), API e realtime
- Font Awesome per le icone

Nessun framework, nessun bundler: si edita e si ricarica la pagina.

## Struttura del progetto

```
AsHome/
├── index.html               markup di tutte le viste (login, onboarding,
│                             le due app pari), nessuna logica inline
├── css/
│   └── style.css              aggiustamenti non coperti da Tailwind
├── js/
│   ├── config.js               chiavi Supabase, nomi tabella/schema, versione
│   ├── supabaseClient.js       istanza condivisa del client Supabase
│   ├── session-state.js        stato condiviso: utente e Casa correnti
│   │
│   ├── auth-api.js             wrapper su Supabase Auth (magic link, sessione)
│   ├── casa-api.js             crea/unisciti a una Casa
│   ├── onboarding-ui.js        DOM di login e onboarding Casa
│   │
│   ├── api.js                  query/scritture della lista della spesa
│   ├── state.js                stato in memoria della lista della spesa
│   ├── suggestions.js          motore di suggerimenti: puro, nessuna chiamata di rete
│   ├── ui.js                   rendering DOM della lista della spesa
│   ├── app.js                  orchestratore della lista della spesa (espone
│   │                            apriModaleNuovoProdotto(), unico punto di
│   │                            integrazione col Piano Alimentare)
│   │
│   ├── mealplan-api.js         query/scritture del Piano Alimentare
│   ├── mealplan-state.js       stato in memoria del Piano Alimentare
│   ├── mealplan-ui.js          rendering DOM del Piano Alimentare
│   ├── mealplan-app.js         orchestratore del Piano Alimentare
│   │
│   └── main.js                 vero punto d'ingresso: gate login/Casa, switcher
│                                tra le due app, poi avvia app.js e mealplan-app.js
├── migrations/                storico delle modifiche allo schema, in ordine
│   ├── 001_init.sql             lista_spesa
│   ├── 002_suggerimenti.sql     suggerimenti_ignorati
│   ├── 003_reset_pulito.sql     ⚠️ svuota i dati esistenti (vedi Setup)
│   ├── 004_case.sql             abitazioni, membri_casa, RLS di base
│   ├── 005_casa_id_su_tabelle_esistenti.sql
│   ├── 006_dispensa.sql         categorie_alimento, alimenti
│   ├── 007_piani.sql            piani, giorni, pasti, alimenti previsti
│   ├── 008_template.sql         template di piano
│   ├── 009_cosa_mi_manca.sql    checklist per piano
│   ├── 010_categorie_gestibili.sql  policy update/delete per Impostazioni
│   └── 011_categorie_nel_piano.sql  piano_pasto_categorie, categoria_id
├── schema.sql                 schema COMPLETO, per un setup da zero
├── CHANGELOG.md                storico delle versioni consegnate
└── README.md
```

Ogni file ha una responsabilità sola: i file `*-api.js` sono gli unici
che parlano con Supabase (uno per dominio: auth, Casa, lista spesa,
Piano Alimentare), i file `*-ui.js` sono gli unici che toccano il DOM,
i file `*-app.js`/`main.js` li collegano rispondendo agli eventi utente
(delegati tramite attributi `data-action`, mai `onclick` inline).

## Case: come funziona l'autenticazione

Non esiste un account "admin": chiunque può creare una Casa o unirsi a
una esistente.

1. Si accede con la propria email: Supabase manda un **magic link**,
   nessuna password da ricordare. Un click e si è dentro.
2. Al primo accesso, se non si appartiene già a nessuna Casa, si
   sceglie tra **creare una Casa** (le viene generato un codice invito,
   es. `CASA-4K7X`) o **unirsi con un codice** ricevuto da qualcuno.
3. Da quel momento lista della spesa, dispensa, piani e storico sono
   condivisi e sincronizzati in tempo reale con chiunque altro sia
   nella stessa Casa.

Tecnicamente: nome tecnico della tabella è `abitazioni` (`CASE` è
parola riservata in SQL), ma nel codice e nell'interfaccia si parla
sempre di "Casa"/"Case". La sicurezza è demandata interamente alle
policy di Row Level Security di Postgres — vedi `migrations/004_case.sql`
per i dettagli, commentati riga per riga, incluso un bug di RLS
scoperto e risolto durante lo sviluppo (generazione dell'id della Casa
lato client invece che lato server).

## "Potresti aver bisogno di" — come funziona

Nessuna AI generativa: è statistica semplice sullo storico che la Casa
ha già.

1. Ogni volta che si preme **"Spesa Finita"**, gli articoli spuntati
   vengono archiviati con un timestamp.
2. Ad ogni caricamento, `js/suggestions.js` raggruppa lo storico per
   nome prodotto (normalizzato: maiuscole/minuscole e accenti non
   contano) e calcola l'intervallo medio tra un acquisto e il
   successivo, e quanto è regolare.
3. Un prodotto viene proposto solo se: è stato comprato almeno 3
   volte, il ritmo è abbastanza regolare (o comunque frequente negli
   ultimi 60 giorni), non è già in lista, non è stato scartato di
   recente, ed è passato almeno il 70% del suo intervallo medio
   dall'ultima volta. Parametri in `SUGGESTION_RULES` (`js/config.js`).

**"+ Aggiungi"** inserisce il suggerimento in lista riusando categoria
e negozio dell'ultima volta; **"Non ora"** lo nasconde per 7 giorni;
**"Non suggerire più"** lo scarta in modo permanente.

## Piano Alimentare — come funziona

Un livello di organizzazione affiancato alla lista della spesa, non
una seconda lista né un'app nutrizionale.

1. Si popola la **Dispensa**: cosa la Casa mangia normalmente, con le
   categorie a cui ogni alimento appartiene (un alimento può stare in
   più categorie). Le categorie stesse si gestiscono da
   **Impostazioni**; i **Template** hanno una vista propria, dove si
   costruiscono giorno per giorno (quali pasti servono, quali
   categorie sono attese per ciascuno).
2. Si crea un **piano** — vuoto, da un **template**, o clonando
   l'intera settimana precedente. Compilare da template non chiede
   subito quali alimenti scegliere: il piano nasce con le stesse
   sezioni-categoria del template (es. "Lunedì Pranzo" → Carboidrati +
   Verdura), pronte da riempire con calma.
3. Nella vista "Piano", ogni sezione ha il proprio "+": propone solo
   gli alimenti della dispensa che appartengono a quella categoria. Un
   pasto senza sezioni (piano creato vuoto) resta una lista libera, con
   un "+" che propone l'intera dispensa.
4. Nella vista "Cosa mi manca" si genera la checklist di tutto ciò che
   il piano prevede. Per ogni alimento: **Manca** lo fa entrare nella
   lista della spesa attraverso il suo normale modulo di inserimento
   (quantità, negozio, note, categoria — nessun campo lasciato vuoto a
   forza); **Ce l'ho** lo toglie dalla checklist senza altre
   conseguenze. In entrambi i casi la riga sparisce: non è un flag da
   spuntare avanti e indietro, è una decisione presa una volta.

Eliminare un piano elimina a cascata giorni/pasti/sezioni/checklist
collegati, ma **non** tocca la dispensa: gli alimenti restano per il
prossimo piano. Eliminare una categoria da Impostazioni la toglie da
**tutti** gli alimenti, le sezioni-piano e i template di **tutte** le
Case che la usano (è condivisa globalmente, come da progettazione) —
l'interfaccia lo ricorda prima di confermare; gli alimenti già
inseriti in una sezione non vengono toccati, solo l'etichetta di
sezione.

## Setup

### 1. Avviare l'app

Serve un server statico locale (i moduli ES non funzionano aprendo il
file `index.html` direttamente con doppio click). Con VS Code, il modo
più semplice è l'estensione **Live Server**: apri la cartella,
tasto destro su `index.html` → *Open with Live Server*.

### 2. Configurare Supabase

Il file `js/config.js` punta già a un progetto Supabase funzionante,
ma **prima di usare il Piano Alimentare e le Case serve eseguire le
nuove migrazioni**, perché introducono l'autenticazione (prima
assente). Se vuoi ripartire da un progetto tuo:

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Apri l'**SQL Editor** ed esegui `schema.sql` (schema completo, per
   un progetto nuovo).
3. In **Settings → API → Exposed schemas**, aggiungi `AsHome`.
4. In **Authentication → Providers → Email**, verifica che l'accesso
   via **magic link / OTP** sia abilitato (lo è di default). Se non
   vuoi che venga richiesta una conferma aggiuntiva, controlla anche
   **Authentication → Settings**.
5. In **Settings → API**, copia *Project URL* e *anon/public key* in
   `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

> ⚠️ **Se stai aggiornando un'installazione precedente alla v2.0**
> (solo lista della spesa, senza login): esegui in ordine da
> `migrations/003_reset_pulito.sql` a `migrations/011_categorie_nel_piano.sql`.
> **La 003 svuota `lista_spesa` e `suggerimenti_ignorati` esistenti** —
> è una scelta deliberata (si riparte puliti passando al modello a
> Case), non un effetto collaterale: se hai dati a cui tieni,
> esportali prima.
>
> Se invece stai già sulla v2.x (Case e Piano Alimentare già
> presenti), esegui solo le migrazioni successive a quella che hai
> già applicato per ultima — sono numerate e additive.

> La anon key è pensata per stare nel codice client-side: con
> l'autenticazione attiva, senza un utente loggato nessuna query passa
> comunque — la sicurezza reale è nelle policy RLS (`auth.uid()` +
> appartenenza alla Casa), non nella segretezza della chiave.

### 3. Accesso da più dispositivi (magic link) ⚠️ importante

Il login via magic link manda un'email con un link: quel link deve
poter essere aperto da **qualunque dispositivo**, non solo da quello
su cui gira l'app in quel momento. Finché l'app gira solo su Live
Server (`localhost`), il link nella mail punta a `localhost` — inutile
se lo apri dal telefono. Serve un indirizzo fisso e pubblico.

**Opzione più semplice, gratuita, zero configurazione (GitHub Pages)**:

1. Crea un repository su GitHub e carica questa cartella (`git push`,
   o trascina i file dall'interfaccia web di GitHub).
2. Nel repository: **Settings → Pages → Source**, scegli il branch
   (es. `main`) e la cartella (`/root`). Salva.
3. Dopo un minuto, GitHub mostra l'URL pubblico (tipo
   `https://tuonome.github.io/AsHome/`) — apri quel link, non più
   Live Server, per un uso da più dispositivi.
4. Incolla quello stesso URL in `js/config.js` (`APP_URL`).
5. Nel progetto Supabase: **Authentication → URL Configuration**,
   aggiungi lo stesso URL sia come **Site URL** sia in
   **Redirect URLs** (Supabase accetta redirect solo verso indirizzi
   in questa lista, per sicurezza).

Da quel momento il link via email funziona aprendo la mail da
qualsiasi dispositivo. Se preferisci un altro host (Netlify, Vercel,
un tuo server) il procedimento è lo stesso: un URL fisso, messo sia in
`APP_URL` sia nelle Redirect URLs di Supabase.

> Se nel giro di pochi tentativi ravvicinati vedi un errore di rate
> limit sull'invio delle email di accesso, è una protezione automatica
> di Supabase contro gli abusi (non è un bug): si sblocca da sola
> dopo un breve periodo di attesa, non serve fare nulla.

## Note

Interfaccia e testi sono in italiano. Nomi tecnici che restano in
italiano per coerenza con lo schema esistente: `lista_spesa`, `casa_id`,
`abitazioni` (= "Casa" nell'interfaccia), `alimenti`, `piani`.

Ogni consegna aggiorna `CHANGELOG.md` e la versione mostrata
nell'interfaccia (`APP_VERSION` in `js/config.js`).
