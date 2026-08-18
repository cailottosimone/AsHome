// js/supabaseClient.js
// Istanzia un unico client Supabase condiviso da tutta l'app.

import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_SCHEMA } from "./config.js";

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: DB_SCHEMA },
});
