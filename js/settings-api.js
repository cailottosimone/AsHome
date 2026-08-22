// js/settings-api.js
// Unico punto di contatto con le tabelle di Impostazioni che non
// appartengono specificamente né alla Lista Spesa né al Piano
// Alimentare, ma sono condivise tra le due. Per ora: i supermercati.
// (Le categorie alimento, pur mostrate nella stessa vista, restano
// gestite da mealplan-api.js: sono nate lì e altro codice del Piano
// Alimentare le usa già — nessun motivo di spostarle.)

import { db } from "./supabaseClient.js";
import { SUPERMERCATI_TABLE, SETTINGS_REALTIME_CHANNEL, DB_SCHEMA } from "./config.js";

export async function fetchSupermercati(casaId) {
  const { data, error } = await db
    .from(SUPERMERCATI_TABLE)
    .select("id, nome")
    .eq("casa_id", casaId)
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function createSupermercato(casaId, nome) {
  const { error } = await db.from(SUPERMERCATI_TABLE).insert([{ casa_id: casaId, nome }]);
  if (error) throw error;
}

export async function deleteSupermercato(supermercatoId) {
  const { error } = await db.from(SUPERMERCATI_TABLE).delete().eq("id", supermercatoId);
  if (error) throw error;
}

export function subscribeSettingsRealtime(casaId, onChange) {
  return db
    .channel(SETTINGS_REALTIME_CHANNEL)
    .on(
      "postgres_changes",
      { event: "*", schema: DB_SCHEMA, table: SUPERMERCATI_TABLE, filter: `casa_id=eq.${casaId}` },
      onChange
    )
    .subscribe();
}
