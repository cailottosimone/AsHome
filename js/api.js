// js/api.js
// Unico punto di contatto con Supabase per la lista della spesa e i
// suggerimenti. Nessun altro modulo parla direttamente con `db`.

import { db } from "./supabaseClient.js";
import {
  DB_TABLE, REALTIME_CHANNEL, DB_SCHEMA,
  SUGGESTIONS_TABLE, SUGGESTIONS_REALTIME_CHANNEL,
} from "./config.js";

/** Recupera tutti gli articoli (attivi + archiviati) di una Casa, dal più recente. */
export async function fetchItems(casaId) {
  const { data, error } = await db
    .from(DB_TABLE)
    .select("*")
    .eq("casa_id", casaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Crea un nuovo articolo nella Casa indicata. */
export async function createItem(itemData, casaId) {
  const payload = { ...itemData, casa_id: casaId, acquistato: false, archiviato: false };
  const { error } = await db.from(DB_TABLE).insert([payload]);
  if (error) throw error;
}

/** Aggiorna i campi di un articolo esistente. */
export async function updateItem(id, itemData) {
  const { error } = await db.from(DB_TABLE).update(itemData).eq("id", id);
  if (error) throw error;
}

/** Segna/toglie un articolo come acquistato. */
export async function setPurchased(id, acquistato) {
  const { error } = await db.from(DB_TABLE).update({ acquistato }).eq("id", id);
  if (error) throw error;
}

/** Archivia un gruppo di articoli (fine spesa), con timestamp. */
export async function archiveItems(ids) {
  const { error } = await db
    .from(DB_TABLE)
    .update({ archiviato: true, data_archiviazione: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

/** Ripristina un articolo archiviato rimettendolo nella lista attiva. */
export async function restoreItem(id) {
  const { error } = await db
    .from(DB_TABLE)
    .update({ archiviato: false, acquistato: false, data_archiviazione: null })
    .eq("id", id);
  if (error) throw error;
}

/** Elimina definitivamente un articolo. */
export async function deleteItem(id) {
  const { error } = await db.from(DB_TABLE).delete().eq("id", id);
  if (error) throw error;
}

/** Svuota completamente lo storico. */
export async function deleteItems(ids) {
  const { error } = await db.from(DB_TABLE).delete().in("id", ids);
  if (error) throw error;
}

/**
 * Si iscrive ai cambiamenti realtime sulla lista della Casa indicata e
 * invoca `onChange` ogni volta che qualcosa cambia (da questo o da un
 * altro dispositivo). Ritorna la subscription.
 */
export function subscribeRealtime(casaId, onChange) {
  return db
    .channel(REALTIME_CHANNEL)
    .on(
      "postgres_changes",
      { event: "*", schema: DB_SCHEMA, table: DB_TABLE, filter: `casa_id=eq.${casaId}` },
      onChange
    )
    .subscribe();
}

/* ── Suggerimenti ignorati ("Non ora" / "Non suggerire più") ── */

/** Recupera tutte le esclusioni attive (snooze o dismiss permanenti) di una Casa. */
export async function fetchDismissedSuggestions(casaId) {
  const { data, error } = await db.from(SUGGESTIONS_TABLE).select("*").eq("casa_id", casaId);
  if (error) throw error;
  return data ?? [];
}

/** Ignora un suggerimento per qualche giorno ("Non ora"). */
export async function snoozeSuggestion(prodottoNormalizzato, giorni, casaId) {
  const snoozeFino = new Date(Date.now() + giorni * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await db.from(SUGGESTIONS_TABLE).insert([{
    prodotto_normalizzato: prodottoNormalizzato,
    tipo: "temporaneo",
    snooze_fino: snoozeFino,
    casa_id: casaId,
  }]);
  if (error) throw error;
}

/** Ignora un suggerimento per sempre ("Non suggerire più"). */
export async function dismissSuggestionForever(prodottoNormalizzato, casaId) {
  const { error } = await db.from(SUGGESTIONS_TABLE).insert([{
    prodotto_normalizzato: prodottoNormalizzato,
    tipo: "permanente",
    snooze_fino: null,
    casa_id: casaId,
  }]);
  if (error) throw error;
}

/** Si iscrive ai cambiamenti realtime sulle esclusioni di una Casa (sync multi-dispositivo). */
export function subscribeSuggestionsRealtime(casaId, onChange) {
  return db
    .channel(SUGGESTIONS_REALTIME_CHANNEL)
    .on(
      "postgres_changes",
      { event: "*", schema: DB_SCHEMA, table: SUGGESTIONS_TABLE, filter: `casa_id=eq.${casaId}` },
      onChange
    )
    .subscribe();
}
