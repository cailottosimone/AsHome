// js/mealplan-api.js
// Unico punto di contatto con le tabelle del Piano Alimentare
// (categorie_alimento, alimenti, piani, template, cosa-mi-manca).

import { db } from "./supabaseClient.js";
import {
  CATEGORIE_ALIMENTO_TABLE, ALIMENTI_TABLE, ALIMENTI_CATEGORIE_TABLE,
  TIPI_PASTO_TABLE, PIANI_TABLE, PIANO_GIORNI_TABLE, PIANO_PASTI_TABLE,
  PIANO_PASTO_ALIMENTI_TABLE, PIANO_PASTO_CATEGORIE_TABLE,
  TEMPLATE_PIANI_TABLE, TEMPLATE_GIORNI_TABLE,
  TEMPLATE_PASTI_TABLE, TEMPLATE_PASTO_CATEGORIE_TABLE, PIANO_ALIMENTI_STATO_TABLE,
  MEALPLAN_REALTIME_CHANNEL, DB_SCHEMA,
} from "./config.js";

/* ── Categorie (globali) e Dispensa ── */

export async function fetchCategorie() {
  const { data, error } = await db.from(CATEGORIE_ALIMENTO_TABLE).select("id, nome").order("nome");
  if (error) throw error;
  return data ?? [];
}

/** Crea una nuova categoria (condivisa tra tutte le Case). Da Impostazioni. */
export async function createCategoria(nome) {
  const { data, error } = await db
    .from(CATEGORIE_ALIMENTO_TABLE).insert([{ nome }]).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Elimina una categoria (a cascata da tutti gli alimenti/template che la usano, in ogni Casa). */
export async function deleteCategoria(categoriaId) {
  const { error } = await db.from(CATEGORIE_ALIMENTO_TABLE).delete().eq("id", categoriaId);
  if (error) throw error;
}

/** Alimenti della Casa, con le categorie a cui appartengono ciascuno. */
export async function fetchAlimenti(casaId) {
  const { data, error } = await db
    .from(ALIMENTI_TABLE)
    .select(`id, nome, ${ALIMENTI_CATEGORIE_TABLE}(categoria_id, ${CATEGORIE_ALIMENTO_TABLE}(id, nome))`)
    .eq("casa_id", casaId)
    .order("nome");
  if (error) throw error;

  return (data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    categorie: (a[ALIMENTI_CATEGORIE_TABLE] ?? []).map((ac) => ac[CATEGORIE_ALIMENTO_TABLE]),
  }));
}

/** Crea un alimento in dispensa e lo associa alle categorie scelte. */
export async function createAlimento(casaId, nome, categoriaIds) {
  const { data, error } = await db
    .from(ALIMENTI_TABLE)
    .insert([{ casa_id: casaId, nome }])
    .select("id")
    .single();
  if (error) throw error;

  if (categoriaIds?.length) {
    const righe = categoriaIds.map((categoriaId) => ({
      alimento_id: data.id, categoria_id: categoriaId, casa_id: casaId,
    }));
    const { error: erroreCategorie } = await db.from(ALIMENTI_CATEGORIE_TABLE).insert(righe);
    if (erroreCategorie) throw erroreCategorie;
  }

  return data.id;
}

/** Elimina un alimento dalla dispensa (a cascata: categorie, presenze nei piani). */
export async function deleteAlimento(alimentoId) {
  const { error } = await db.from(ALIMENTI_TABLE).delete().eq("id", alimentoId);
  if (error) throw error;
}

/* ── Tipi pasto ── */

export async function fetchTipiPasto() {
  const { data, error } = await db.from(TIPI_PASTO_TABLE).select("id, nome, ordine").order("ordine");
  if (error) throw error;
  return data ?? [];
}

/* ── Piani ── */

export async function fetchPiani(casaId) {
  const { data, error } = await db
    .from(PIANI_TABLE)
    .select("id, nome, created_at")
    .eq("casa_id", casaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Crea i 7 giorni × N pasti (uno per ogni tipo pasto) come struttura vuota. */
async function creaScheletroSettimana(pianoId, casaId, tipiPasto) {
  const righeGiorni = Array.from({ length: 7 }, (_, giorno) => ({
    piano_id: pianoId, casa_id: casaId, giorno_settimana: giorno,
  }));
  const { data: giorni, error: erroreGiorni } = await db
    .from(PIANO_GIORNI_TABLE).insert(righeGiorni).select("id, giorno_settimana");
  if (erroreGiorni) throw erroreGiorni;

  const righePasti = giorni.flatMap((giorno) =>
    tipiPasto.map((tipo) => ({
      piano_giorno_id: giorno.id, casa_id: casaId, tipo_pasto_id: tipo.id,
    }))
  );
  const { error: errorePasti } = await db.from(PIANO_PASTI_TABLE).insert(righePasti);
  if (errorePasti) throw errorePasti;
}

/** Crea un piano vuoto con la struttura giorni/pasti già pronta da riempire. */
export async function createPianoVuoto(casaId, nome) {
  const tipiPasto = await fetchTipiPasto();
  const { data: piano, error } = await db
    .from(PIANI_TABLE).insert([{ casa_id: casaId, nome }]).select("id").single();
  if (error) throw error;

  await creaScheletroSettimana(piano.id, casaId, tipiPasto);
  return piano.id;
}

/**
 * Legge un piano con l'intera struttura annidata: giorni → pasti (con
 * tipo, sezioni-categoria dichiarate, e alimenti previsti — ciascuno
 * con la categoria sotto cui è stato inserito, se presente). Un'unica
 * richiesta grazie ai nested select di PostgREST, che seguono le
 * foreign key già definite nelle migrazioni.
 */
export async function fetchPianoCompleto(pianoId) {
  const { data, error } = await db
    .from(PIANO_GIORNI_TABLE)
    .select(`
      id, giorno_settimana,
      ${PIANO_PASTI_TABLE} (
        id, tipo_pasto_id,
        ${TIPI_PASTO_TABLE} (nome, ordine),
        ${PIANO_PASTO_CATEGORIE_TABLE} (id, categoria_id, ${CATEGORIE_ALIMENTO_TABLE} (nome)),
        ${PIANO_PASTO_ALIMENTI_TABLE} (id, alimento_id, categoria_id, ${ALIMENTI_TABLE} (nome))
      )
    `)
    .eq("piano_id", pianoId)
    .order("giorno_settimana");
  if (error) throw error;
  return data ?? [];
}

/** Aggiunge un alimento a un pasto, opzionalmente sotto una sezione-categoria. */
export async function addAlimentoAPasto(pianoPastoId, casaId, alimentoId, categoriaId = null) {
  const { error } = await db
    .from(PIANO_PASTO_ALIMENTI_TABLE)
    .insert([{ piano_pasto_id: pianoPastoId, casa_id: casaId, alimento_id: alimentoId, categoria_id: categoriaId }]);
  if (error) throw error;
}

export async function removeAlimentoDaPasto(rigaId) {
  const { error } = await db.from(PIANO_PASTO_ALIMENTI_TABLE).delete().eq("id", rigaId);
  if (error) throw error;
}

export async function deletePiano(pianoId) {
  const { error } = await db.from(PIANI_TABLE).delete().eq("id", pianoId);
  if (error) throw error;
}

/**
 * Clona l'intera struttura di un piano precedente (giorni, pasti,
 * sezioni-categoria ED alimenti già scelti, con la loro sezione) in un
 * piano nuovo — "Compila dalla settimana precedente": parte da un
 * piano pronto, modificabile pasto per pasto.
 */
export async function compilaDaSettimanaPrecedente(casaId, nome, pianoOrigineId) {
  const struttura = await fetchPianoCompleto(pianoOrigineId);

  const { data: nuovoPiano, error } = await db
    .from(PIANI_TABLE).insert([{ casa_id: casaId, nome }]).select("id").single();
  if (error) throw error;

  for (const giorno of struttura) {
    const { data: nuovoGiorno, error: erroreGiorno } = await db
      .from(PIANO_GIORNI_TABLE)
      .insert([{ piano_id: nuovoPiano.id, casa_id: casaId, giorno_settimana: giorno.giorno_settimana }])
      .select("id").single();
    if (erroreGiorno) throw erroreGiorno;

    for (const pasto of giorno[PIANO_PASTI_TABLE] ?? []) {
      const { data: nuovoPasto, error: erronePasto } = await db
        .from(PIANO_PASTI_TABLE)
        .insert([{ piano_giorno_id: nuovoGiorno.id, casa_id: casaId, tipo_pasto_id: pasto.tipo_pasto_id }])
        .select("id").single();
      if (erronePasto) throw erronePasto;

      const categorie = pasto[PIANO_PASTO_CATEGORIE_TABLE] ?? [];
      if (categorie.length) {
        const righeCategorie = categorie.map((c) => ({
          piano_pasto_id: nuovoPasto.id, casa_id: casaId, categoria_id: c.categoria_id,
        }));
        const { error: erroreCategorie } = await db.from(PIANO_PASTO_CATEGORIE_TABLE).insert(righeCategorie);
        if (erroreCategorie) throw erroreCategorie;
      }

      const alimenti = pasto[PIANO_PASTO_ALIMENTI_TABLE] ?? [];
      if (alimenti.length) {
        const righe = alimenti.map((a) => ({
          piano_pasto_id: nuovoPasto.id, casa_id: casaId, alimento_id: a.alimento_id, categoria_id: a.categoria_id,
        }));
        const { error: erroreAlimenti } = await db.from(PIANO_PASTO_ALIMENTI_TABLE).insert(righe);
        if (erroreAlimenti) throw erroreAlimenti;
      }
    }
  }

  return nuovoPiano.id;
}

/* ── Template ── */

/** Template visibili: quelli di sistema + quelli della Casa (le RLS filtrano già). */
export async function fetchTemplates() {
  const { data, error } = await db
    .from(TEMPLATE_PIANI_TABLE)
    .select("id, nome, casa_id")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTemplateCompleto(templateId) {
  const { data, error } = await db
    .from(TEMPLATE_GIORNI_TABLE)
    .select(`
      id, giorno_settimana,
      ${TEMPLATE_PASTI_TABLE} (
        id, tipo_pasto_id,
        ${TIPI_PASTO_TABLE} (nome, ordine),
        ${TEMPLATE_PASTO_CATEGORIE_TABLE} (id, categoria_id, ${CATEGORIE_ALIMENTO_TABLE} (nome))
      )
    `)
    .eq("template_id", templateId)
    .order("giorno_settimana");
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(casaId, nome) {
  const { data, error } = await db
    .from(TEMPLATE_PIANI_TABLE).insert([{ casa_id: casaId, nome }]).select("id").single();
  if (error) throw error;

  // Come per i piani: i 7 giorni si creano subito, vuoti, così il
  // costruttore del template li mostra tutti fin dall'inizio.
  const righeGiorni = Array.from({ length: 7 }, (_, giorno) => ({
    template_id: data.id, casa_id: casaId, giorno_settimana: giorno,
  }));
  const { error: erroreGiorni } = await db.from(TEMPLATE_GIORNI_TABLE).insert(righeGiorni);
  if (erroreGiorni) throw erroreGiorni;

  return data.id;
}

export async function addGiornoATemplate(templateId, casaId, giornoSettimana) {
  const { data, error } = await db
    .from(TEMPLATE_GIORNI_TABLE)
    .insert([{ template_id: templateId, casa_id: casaId, giorno_settimana: giornoSettimana }])
    .select("id").single();
  if (error) throw error;
  return data.id;
}

export async function addPastoATemplate(templateGiornoId, casaId, tipoPastoId) {
  const { data, error } = await db
    .from(TEMPLATE_PASTI_TABLE)
    .insert([{ template_giorno_id: templateGiornoId, casa_id: casaId, tipo_pasto_id: tipoPastoId }])
    .select("id").single();
  if (error) throw error;
  return data.id;
}

export async function addCategoriaAPasto(templatePastoId, casaId, categoriaId) {
  const { error } = await db
    .from(TEMPLATE_PASTO_CATEGORIE_TABLE)
    .insert([{ template_pasto_id: templatePastoId, casa_id: casaId, categoria_id: categoriaId }]);
  if (error) throw error;
}

/** Rimuove un pasto dal template in costruzione (a cascata: le sue categorie). */
export async function removePastoDaTemplate(templatePastoId) {
  const { error } = await db.from(TEMPLATE_PASTI_TABLE).delete().eq("id", templatePastoId);
  if (error) throw error;
}

/** Rimuove una singola categoria attesa da un pasto del template. */
export async function removeCategoriaDaPasto(rigaId) {
  const { error } = await db.from(TEMPLATE_PASTO_CATEGORIE_TABLE).delete().eq("id", rigaId);
  if (error) throw error;
}

export async function deleteTemplate(templateId) {
  const { error } = await db.from(TEMPLATE_PIANI_TABLE).delete().eq("id", templateId);
  if (error) throw error;
}

/**
 * Crea un piano a partire da un template: stessa struttura di
 * giorni/pasti, e per ogni pasto le stesse sezioni-categoria del
 * template (es. "Lunedì Pranzo" → Carboidrati + Verdura). Nessun
 * alimento viene scelto qui: si riempiono le sezioni con calma dalla
 * vista Piano, dove ogni sezione propone solo gli alimenti della
 * dispensa compatibili con quella categoria.
 */
export async function compilaDaTemplate(casaId, nome, templateId) {
  const struttura = await fetchTemplateCompleto(templateId);

  const { data: piano, error } = await db
    .from(PIANI_TABLE).insert([{ casa_id: casaId, nome }]).select("id").single();
  if (error) throw error;

  for (const giorno of struttura) {
    const { data: nuovoGiorno, error: erroreGiorno } = await db
      .from(PIANO_GIORNI_TABLE)
      .insert([{ piano_id: piano.id, casa_id: casaId, giorno_settimana: giorno.giorno_settimana }])
      .select("id").single();
    if (erroreGiorno) throw erroreGiorno;

    for (const pasto of giorno[TEMPLATE_PASTI_TABLE] ?? []) {
      const { data: nuovoPasto, error: erronePasto } = await db
        .from(PIANO_PASTI_TABLE)
        .insert([{ piano_giorno_id: nuovoGiorno.id, casa_id: casaId, tipo_pasto_id: pasto.tipo_pasto_id }])
        .select("id").single();
      if (erronePasto) throw erronePasto;

      const categorie = pasto[TEMPLATE_PASTO_CATEGORIE_TABLE] ?? [];
      if (categorie.length) {
        const righeCategorie = categorie.map((c) => ({
          piano_pasto_id: nuovoPasto.id, casa_id: casaId, categoria_id: c.categoria_id,
        }));
        const { error: erroreCategorie } = await db.from(PIANO_PASTO_CATEGORIE_TABLE).insert(righeCategorie);
        if (erroreCategorie) throw erroreCategorie;
      }
    }
  }

  return piano.id;
}

/* ── Cosa mi manca ── */

/** Alimenti distinti previsti in un piano, deduplicati lato client. */
export async function fetchAlimentiDelPiano(pianoId) {
  const { data, error } = await db
    .from(PIANO_GIORNI_TABLE)
    .select(`${PIANO_PASTI_TABLE} (${PIANO_PASTO_ALIMENTI_TABLE} (alimento_id, ${ALIMENTI_TABLE} (id, nome)))`)
    .eq("piano_id", pianoId);
  if (error) throw error;

  const mappa = new Map();
  for (const giorno of data ?? []) {
    for (const pasto of giorno[PIANO_PASTI_TABLE] ?? []) {
      for (const riga of pasto[PIANO_PASTO_ALIMENTI_TABLE] ?? []) {
        const alimento = riga[ALIMENTI_TABLE];
        if (alimento) mappa.set(alimento.id, alimento.nome);
      }
    }
  }
  return Array.from(mappa, ([id, nome]) => ({ id, nome }));
}

/** Genera (se non esiste già) una riga di stato per ogni alimento del piano. */
export async function generaStatoMancanti(pianoId, casaId) {
  const alimenti = await fetchAlimentiDelPiano(pianoId);
  if (!alimenti.length) return;

  const righe = alimenti.map((a) => ({ piano_id: pianoId, casa_id: casaId, alimento_id: a.id }));
  const { error } = await db
    .from(PIANO_ALIMENTI_STATO_TABLE)
    .upsert(righe, { onConflict: "piano_id,alimento_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function fetchStatoMancanti(pianoId) {
  const { data, error } = await db
    .from(PIANO_ALIMENTI_STATO_TABLE)
    .select(`id, alimento_id, ${ALIMENTI_TABLE} (nome)`)
    .eq("piano_id", pianoId);
  if (error) throw error;

  return (data ?? [])
    .map((r) => ({ id: r.id, alimentoId: r.alimento_id, nome: r[ALIMENTI_TABLE]?.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Risolve una riga della checklist "Cosa mi manca" rimuovendola: sia che
 * l'alimento sia stato aggiunto alla lista della spesa ("Manca") sia che
 * sia stato semplicemente ignorato ("Ce l'ho già"), la riga sparisce
 * dalla checklist — la decisione stessa è ciò che la risolve, non un
 * flag da tenere aggiornato avanti e indietro.
 */
export async function deleteStatoMancante(statoId) {
  const { error } = await db.from(PIANO_ALIMENTI_STATO_TABLE).delete().eq("id", statoId);
  if (error) throw error;
}

/* ── Realtime ── */

/** Un solo canale per tutte le tabelle del Piano Alimentare che cambiano durante l'uso.
 * Nota: il filtro per casa_id esclude gli aggiornamenti ai template DI SISTEMA
 * (casa_id null, per definizione condivisi tra tutte le Case) — cambiano
 * di rado, quindi in quel caso basta ricaricare manualmente la pagina. */
export function subscribeMealplanRealtime(casaId, onChange) {
  const tabelle = [
    ALIMENTI_TABLE, ALIMENTI_CATEGORIE_TABLE, PIANI_TABLE, PIANO_GIORNI_TABLE,
    PIANO_PASTI_TABLE, PIANO_PASTO_ALIMENTI_TABLE, PIANO_PASTO_CATEGORIE_TABLE, PIANO_ALIMENTI_STATO_TABLE,
    TEMPLATE_PIANI_TABLE, TEMPLATE_GIORNI_TABLE, TEMPLATE_PASTI_TABLE, TEMPLATE_PASTO_CATEGORIE_TABLE,
  ];
  let channel = db.channel(MEALPLAN_REALTIME_CHANNEL);
  for (const tabella of tabelle) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: DB_SCHEMA, table: tabella, filter: `casa_id=eq.${casaId}` },
      onChange
    );
  }
  return channel.subscribe();
}
