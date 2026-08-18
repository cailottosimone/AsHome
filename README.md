# AsHome

Lista della spesa condivisa, in tempo reale, per la casa. Aggiungi
prodotti, spuntali mentre fai la spesa, archivia lo storico e tieni
tutto sincronizzato tra i dispositivi di casa.

## Funzionalità

- **Lista attiva** raggruppata automaticamente per categoria (Frutta e
  Verdura, Carne e Pesce, Latticini e Uova, Dispensa, Surgelati,
  Bevande, Casa e Cura, Altro).
- **Filtro per negozio**, generato dinamicamente dai negozi già usati.
- **Aggiunta/modifica prodotto** con quantità, negozio e note libere.
- **Sincronizzazione realtime**: se due persone aprono l'app da due
  telefoni diversi, ogni modifica compare subito su entrambi (tramite
  le subscription realtime di Supabase).
- **"Spesa Finita"**: archivia in un colpo solo tutti gli articoli
  spuntati, con data e ora.
- **Storico acquisti**, con possibilità di ripristinare un articolo in
  lista o svuotare tutto lo storico.
- Interfaccia pensata mobile-first, con pulsante flottante (FAB) su
  telefono e barra azioni completa su desktop.

## Stack

- HTML + [Tailwind CSS](https://tailwindcss.com) via CDN (nessuna build
  richiesta)
- JavaScript vanilla, organizzato in moduli ES (`type="module"`)
- [Supabase](https://supabase.com) per database Postgres, API e
  realtime
- Font Awesome per le icone

Nessun framework, nessun bundler: si edita e si ricarica la pagina.

## Struttura del progetto

```
AsHome/
├── index.html          markup della pagina, nessuna logica inline
├── css/
│   └── style.css        aggiustamenti non coperti da Tailwind
├── js/
│   ├── config.js         chiavi Supabase, nomi tabella/schema, categorie
│   ├── supabaseClient.js istanza condivisa del client Supabase
│   ├── api.js             tutte le query/scritture verso Supabase
│   ├── state.js           stato dell'app in memoria (lista, filtro attivo...)
│   ├── ui.js               rendering DOM (liste, modali, form)
│   └── app.js               orchestratore: eventi, collega state/api/ui
├── schema.sql            SQL per creare tabella, RLS e realtime
└── README.md
```

Ogni file ha una responsabilità sola: `api.js` è l'unico che parla con
Supabase, `ui.js` è l'unico che tocca il DOM, `app.js` li collega
rispondendo agli eventi utente (delegati tramite attributi
`data-action` invece di `onclick` inline).

## Setup

### 1. Avviare l'app

Serve un server statico locale (i moduli ES non funzionano aprendo il
file `index.html` direttamente con doppio click). Con VS Code, il modo
più semplice è l'estensione **Live Server**: apri la cartella,
tasto destro su `index.html` → *Open with Live Server*.

### 2. Usare il tuo progetto Supabase (opzionale)

Il file `js/config.js` punta già a un progetto Supabase funzionante.
Se vuoi usarne uno tuo:

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Apri l'**SQL Editor** e incolla il contenuto di `schema.sql`.
3. In **Settings → API → Exposed schemas**, aggiungi `AsHome` (per
   default Supabase espone solo lo schema `public`).
4. In **Settings → API**, copia *Project URL* e *anon/public key* e
   incollali in `js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

> La anon key è pensata per stare nel codice client-side: la
> sicurezza è demandata alle policy di Row Level Security definite in
> `schema.sql`, non alla segretezza della chiave. La policy inclusa è
> volutamente permissiva (adatta a un uso familiare con link privato);
> stringila se l'app dovesse diventare pubblica o multi-famiglia.

## Note

Interfaccia e testi sono in italiano; i nomi di tabella/schema restano
`AsHome` / `lista_spesa` per compatibilità con eventuali dati già
salvati nel progetto Supabase originale.
