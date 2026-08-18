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

// Schema/tabella Postgres dove viene salvata la lista della spesa.
export const DB_SCHEMA = "AsHome";
export const DB_TABLE = "lista_spesa";
export const REALTIME_CHANNEL = "ashome:lista_spesa";

// Categorie prodotto disponibili nel form di aggiunta/modifica.
export const CATEGORIE = [
  { value: "Frutta e Verdura", emoji: "🥦" },
  { value: "Carne e Pesce", emoji: "🥩" },
  { value: "Latticini e Uova", emoji: "🧀" },
  { value: "Dispensa e Secco", emoji: "🌾" },
  { value: "Surgelati", emoji: "🧊" },
  { value: "Bevande", emoji: "🥤" },
  { value: "Casa e Cura", emoji: "🧹" },
  { value: "Altro", emoji: "📦" },
];
