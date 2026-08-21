// js/casa-api.js
// Unico punto di contatto con le tabelle abitazioni/membri_casa.

import { db } from "./supabaseClient.js";
import { CASA_TABLE, MEMBRI_CASA_TABLE, CASA_REALTIME_CHANNEL, DB_SCHEMA } from "./config.js";

// Niente 0/O/1/I nel codice invito: sono facili da confondere quando lo
// si detta o lo si legge su uno schermo piccolo.
const ALFABETO_CODICE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generaCodiceInvito() {
  let codice = "CASA-";
  for (let i = 0; i < 4; i++) {
    codice += ALFABETO_CODICE[Math.floor(Math.random() * ALFABETO_CODICE.length)];
  }
  return codice;
}

/**
 * Crea una nuova Casa e vi aggiunge subito l'utente corrente come membro.
 *
 * L'id viene generato QUI con crypto.randomUUID(), invece di lasciarlo
 * generare al database e rileggerlo dopo con .select(): appena dopo
 * l'INSERT l'utente non è ancora membro della Casa, quindi le RLS gli
 * impedirebbero di rileggere la riga appena creata (vedi il commento in
 * migrations/004_case.sql — bug trovato e corretto durante i test).
 * Generando l'id prima, non serve mai rileggerlo: lo conosciamo già.
 */
export async function creaCasa(nome, userId) {
  const id = crypto.randomUUID();

  let codiceInvito;
  let tentativi = 0;
  // In caso di rarissima collisione sul codice invito (vincolo unique),
  // Postgres risponde con l'errore 23505: si riprova con un nuovo codice.
  for (;;) {
    codiceInvito = generaCodiceInvito();
    const { error } = await db.from(CASA_TABLE).insert([{ id, nome, codice_invito: codiceInvito }]);
    if (!error) break;
    tentativi++;
    if (error.code !== "23505" || tentativi >= 5) throw error;
  }

  const { error: erroreMembro } = await db
    .from(MEMBRI_CASA_TABLE)
    .insert([{ casa_id: id, user_id: userId }]);
  if (erroreMembro) throw erroreMembro;

  return { id, nome, codiceInvito };
}

/**
 * Cerca una Casa dal codice invito, tramite la funzione RPC
 * trova_casa_da_codice — l'unica autorizzata a "vedere" una Casa di cui
 * non sei ancora membro (vedi migrations/004_case.sql).
 */
export async function trovaCasaDaCodice(codice) {
  const { data, error } = await db.rpc("trova_casa_da_codice", { p_codice: codice });
  if (error) throw error;
  return data?.[0] ?? null; // { id, nome } oppure null se il codice non esiste
}

/** Si unisce a una Casa esistente dato il suo codice invito. */
export async function unisciteACasa(codice, userId) {
  const casa = await trovaCasaDaCodice(codice);
  if (!casa) throw new Error("Codice invito non valido.");

  const { error } = await db
    .from(MEMBRI_CASA_TABLE)
    .insert([{ casa_id: casa.id, user_id: userId }]);
  if (error) throw error;

  return casa;
}

/** Le Case di cui l'utente corrente è già membro (di norma una sola). */
export async function fetchMieCase() {
  const { data, error } = await db
    .from(CASA_TABLE)
    .select("id, nome, codice_invito")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

/** Sync realtime: utile per accorgersi se qualcuno si unisce alla tua Casa. */
export function subscribeCasaRealtime(onChange) {
  return db
    .channel(CASA_REALTIME_CHANNEL)
    .on("postgres_changes", { event: "*", schema: DB_SCHEMA, table: MEMBRI_CASA_TABLE }, onChange)
    .subscribe();
}
