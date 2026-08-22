// js/config.js
// Configurazione del progetto Supabase usato da AsHome.
//
// La SUPABASE_ANON_KEY è una "publishable key": per design di Supabase
// può stare nel codice client-side, perché la sicurezza reale è demandata
// alle policy di Row Level Security (RLS) definite sul database, non
// alla segretezza di questa chiave. Vedi README.md per i dettagli.
//
// Se in futuro vuoi puntare questa app a un tuo progetto Supabase,
// ti basta cambiare i due valori qui sotto.

export const SUPABASE_URL = "https://xnkkacszdmrigudkwcio.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_z16j13lRrbWvtAISvx4ssQ_zqNBEckf";

// Versione dell'app, mostrata in piccolo nell'interfaccia. Aggiornala
// ad ogni consegna (vedi CHANGELOG.md per lo storico delle versioni).
export const APP_VERSION = "3.3.0";

// URL pubblico e FISSO dove l'app è raggiungibile (es.
// "https://tuonome.github.io/AsHome/"), usato come destinazione del
// magic link via email. Necessario perché quel link deve poter essere
// aperto da QUALSIASI dispositivo (es. lo apri sul telefono, ma l'app
// magari gira di solito su un PC) — un indirizzo preso "al volo" da
// dove sta girando l'app in quel momento (es. Live Server = localhost)
// funziona solo se apri la mail sullo STESSO dispositivo. Vedi il
// README, sezione "Accesso da più dispositivi", per come ottenerne uno
// gratis in pochi minuti (GitHub Pages).
//
// Finché resta vuota, l'app usa l'indirizzo corrente (comodo in
// sviluppo, ma il magic link funziona solo aprendo la mail sullo
// stesso dispositivo da cui hai fatto richiesta).
export const APP_URL = "";

// Schema/tabella Postgres dove viene salvata la lista della spesa.
export const DB_SCHEMA = "AsHome";
export const DB_TABLE = "lista_spesa";
export const REALTIME_CHANNEL = "ashome:lista_spesa";

// Tabella dove viene ricordato cosa l'utente NON vuole vedersi suggerire
// (snooze temporaneo o dismiss permanente). I suggerimenti veri e propri
// non vengono mai salvati: si calcolano al volo dallo storico.
export const SUGGESTIONS_TABLE = "suggerimenti_ignorati";
export const SUGGESTIONS_REALTIME_CHANNEL = "ashome:suggerimenti_ignorati";

// Parametri del motore di suggerimenti ("La mia spesa che ti conosce").
// Vedi js/suggestions.js per come vengono usati.
export const SUGGESTION_RULES = {
  MIN_ACQUISTI: 3,          // servono almeno 3 acquisti conclusi per riconoscere un pattern
  MAX_COEFF_VARIAZIONE: 0.5, // regolarità richiesta: CV basso = intervalli simili tra loro
  SOGLIA_RITARDO: 0.7,       // suggerisci solo da quando è passato il 70% dell'intervallo medio
  MAX_SUGGERIMENTI: 6,       // quanti mostrarne al massimo, per restare una sezione piccola
  SNOOZE_GIORNI: 7,          // durata del "Non ora"
};

// Categorie prodotto disponibili nel form di aggiunta/modifica.
export const CATEGORIE = [
  { value: "Frutta e Verdura" },
  { value: "Carne e Pesce" },
  { value: "Latticini e Uova" },
  { value: "Dispensa e Secco" },
  { value: "Surgelati" },
  { value: "Bevande" },
  { value: "Casa e Cura" },
  { value: "Altro" },
];

// ── Casa (autenticazione + gruppo condiviso) ──
//
// Nome tecnico della tabella: "abitazioni" (CASE è parola riservata in
// SQL). Nel codice e nell'interfaccia si parla sempre di "Casa"/"Case".
export const CASA_TABLE = "abitazioni";
export const MEMBRI_CASA_TABLE = "membri_casa";
export const CASA_REALTIME_CHANNEL = "ashome:abitazioni";
export const MEMBRI_CASA_REALTIME_CHANNEL = "ashome:membri_casa";

// ── Piano Alimentare ──
export const CATEGORIE_ALIMENTO_TABLE = "categorie_alimento";
export const ALIMENTI_TABLE = "alimenti";
export const ALIMENTI_CATEGORIE_TABLE = "alimenti_categorie";
export const TIPI_PASTO_TABLE = "tipi_pasto";
export const PIANI_TABLE = "piani";
export const PIANO_GIORNI_TABLE = "piano_giorni";
export const PIANO_PASTI_TABLE = "piano_pasti";
export const PIANO_PASTO_ALIMENTI_TABLE = "piano_pasto_alimenti";
export const PIANO_PASTO_CATEGORIE_TABLE = "piano_pasto_categorie";
export const TEMPLATE_PIANI_TABLE = "template_piani";
export const TEMPLATE_GIORNI_TABLE = "template_giorni";
export const TEMPLATE_PASTI_TABLE = "template_pasti";
export const TEMPLATE_PASTO_CATEGORIE_TABLE = "template_pasto_categorie";
export const PIANO_ALIMENTI_STATO_TABLE = "piano_alimenti_stato";
export const MEALPLAN_REALTIME_CHANNEL = "ashome:piano_alimentare";

// Giorni della settimana, indice 0-6 come in piano_giorni.giorno_settimana.
export const GIORNI_SETTIMANA = [
  "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica",
];

// ── Impostazioni globali (condivise tra Lista Spesa e Piano Alimentare) ──
// Supermercati: specifici per Casa (a differenza delle categorie
// alimento, condivise globalmente) — alimentano un suggerimento
// (datalist) sul campo "negozio" della Lista Spesa, senza vincolarlo:
// resta testo libero.
export const SUPERMERCATI_TABLE = "supermercati";
export const SETTINGS_REALTIME_CHANNEL = "ashome:impostazioni_globali";

