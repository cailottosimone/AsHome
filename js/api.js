// js/api.js
// Unico punto di contatto con Supabase. Nessun altro modulo parla
// direttamente con `db`: se domani cambi backend, tocchi solo questo file.

import { db } from "./supabaseClient.js";
import { DB_TABLE, REALTIME_CHANNEL, DB_SCHEMA } from "./config.js";

/** Recupera tutti gli articoli (attivi + archiviati), dal più recente. */
export async function fetchItems() {
  const { data, error } = await db
    .from(DB_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Crea un nuovo articolo. */
export async function createItem(itemData) {
  const payload = { ...itemData, acquistato: false, archiviato: false };
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
 * Si iscrive ai cambiamenti realtime sulla tabella e invoca `onChange`
 * ogni volta che qualcosa cambia (da questo o da un altro dispositivo).
 * Ritorna la subscription, utile se in futuro serve un cleanup esplicito.
 */
export function subscribeRealtime(onChange) {
  return db
    .channel(REALTIME_CHANNEL)
    .on("postgres_changes", { event: "*", schema: DB_SCHEMA, table: DB_TABLE }, onChange)
    .subscribe();
}
