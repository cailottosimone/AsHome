// js/supabaseClient.js
// Istanzia un unico client Supabase condiviso da tutta l'app.

import { SUPABASE_URL, SUPABASE_ANON_KEY, DB_SCHEMA } from "./config.js";

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: DB_SCHEMA },
  // Esplicito anche se già il default: la sessione (dopo il login via
  // magic link) resta salvata nel browser tra una visita e l'altra.
  auth: { persistSession: true, autoRefreshToken: true },
});
