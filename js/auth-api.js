// js/auth-api.js
// Unico punto di contatto con Supabase Auth. Nessun altro modulo chiama
// db.auth direttamente.

import { db } from "./supabaseClient.js";
import { APP_URL } from "./config.js";

/** Invia il magic link all'indirizzo indicato. */
export async function inviaMagicLink(email) {
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      // Dopo aver cliccato il link nella mail, l'utente torna qui.
      // APP_URL (config.js) è l'indirizzo fisso da usare per un accesso
      // che funzioni da qualunque dispositivo — se non è ancora
      // configurato, si usa l'indirizzo corrente (funziona solo aprendo
      // la mail sullo stesso dispositivo, tipico in fase di sviluppo).
      emailRedirectTo: APP_URL || (window.location.origin + window.location.pathname),
    },
  });
  if (error) throw error;
}

/** Sessione corrente, se presente (es. dopo un refresh della pagina). */
export async function getSessioneCorrente() {
  const { data, error } = await db.auth.getSession();
  if (error) throw error;
  return data.session; // null se non autenticato
}

/** Accesso con email e password, alternativo al magic link. */
export async function accediConPassword(email, password) {
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Crea un account con email e password. Ritorna emailGiaConfermata:
 * true se Supabase ha già aperto una sessione (nessuna conferma email
 * richiesta, dipende da un'impostazione del progetto Supabase), false
 * se serve prima cliccare un link di conferma ricevuto via mail.
 */
export async function registratiConPassword(email, password) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw error;
  return { emailGiaConfermata: Boolean(data.session) };
}

/**
 * Chiama `callback(session)` ad ogni cambio di stato dell'autenticazione
 * (login, logout, refresh token, arrivo dal link nella mail...).
 * Ritorna la subscription per un eventuale cleanup.
 */
export function onAuthChange(callback) {
  const { data } = db.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function logout() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}
