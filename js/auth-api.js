// js/auth-api.js
// Unico punto di contatto con Supabase Auth. Nessun altro modulo chiama
// db.auth direttamente.

import { db } from "./supabaseClient.js";

/** Invia il magic link all'indirizzo indicato. */
export async function inviaMagicLink(email) {
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      // Dopo aver cliccato il link nella mail, l'utente torna qui.
      emailRedirectTo: window.location.origin + window.location.pathname,
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
