// js/suggestions.js
// "La lista della spesa che ti conosce" — motore di suggerimenti v1.
//
// Nessuna chiamata di rete qui dentro: riceve gli articoli già caricati
// (storico + lista attiva) e i dismiss già caricati, e restituisce una
// lista di suggerimenti pronti da mostrare. Nessun dato calcolato viene
// persistito: si ricalcola tutto ad ogni caricamento/aggiornamento.

import { SUGGESTION_RULES } from "./config.js";

const MS_GIORNO = 1000 * 60 * 60 * 24;

/**
 * Normalizza un nome prodotto per il confronto/raggruppamento:
 * minuscolo, spazi ripuliti, accenti rimossi. Non è mai salvata come
 * colonna: si ricalcola ogni volta, così migliorarla non richiede
 * nessuna migrazione sui dati esistenti.
 */
export function normalizza(prodotto) {
  return (prodotto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // rimuove i segni diacritici (è → e)
}

function media(numeri) {
  return numeri.reduce((a, b) => a + b, 0) / numeri.length;
}

function coefficienteVariazione(numeri) {
  if (numeri.length < 2) return Infinity;
  const m = media(numeri);
  if (m === 0) return Infinity;
  const varianza = media(numeri.map((n) => (n - m) ** 2));
  return Math.sqrt(varianza) / m;
}

function giorniTra(dataA, dataB) {
  return Math.round((new Date(dataB) - new Date(dataA)) / MS_GIORNO);
}

/**
 * Raggruppa gli acquisti archiviati per prodotto normalizzato,
 * ordinati per data di archiviazione (= quando l'acquisto è concluso,
 * non quando è stato scritto in lista).
 */
function raggruppaPerProdotto(archivedItems) {
  const gruppi = new Map();

  for (const item of archivedItems) {
    if (!item.data_archiviazione) continue;
    const chiave = normalizza(item.prodotto);
    if (!chiave) continue;
    if (!gruppi.has(chiave)) gruppi.set(chiave, []);
    gruppi.get(chiave).push(item);
  }

  for (const occorrenze of gruppi.values()) {
    occorrenze.sort((a, b) => new Date(a.data_archiviazione) - new Date(b.data_archiviazione));
  }

  return gruppi;
}

function eIgnorato(chiave, dismissed, ora) {
  return dismissed.some((d) => {
    if (d.prodotto_normalizzato !== chiave) return false;
    if (d.tipo === "permanente") return true;
    return d.snooze_fino && new Date(d.snooze_fino) > ora;
  });
}

/**
 * Calcola i suggerimenti attuali.
 *
 * @param {object[]} archivedItems - storico (state.getArchivedItems())
 * @param {object[]} activeItems - lista attiva (state.getActiveItems())
 * @param {object[]} dismissed - righe di suggerimenti_ignorati
 * @param {Date} [ora] - iniettabile per i test, default: adesso
 * @returns {Array<{prodottoNormalizzato, prodotto, motivo, ultimaOccorrenza}>}
 */
export function calcolaSuggerimenti(archivedItems, activeItems, dismissed, ora = new Date()) {
  const { MIN_ACQUISTI, MAX_COEFF_VARIAZIONE, SOGLIA_RITARDO, MAX_SUGGERIMENTI } = SUGGESTION_RULES;

  const giaInLista = new Set(activeItems.map((i) => normalizza(i.prodotto)));
  const gruppi = raggruppaPerProdotto(archivedItems);
  const candidati = [];

  for (const [chiave, occorrenze] of gruppi) {
    if (occorrenze.length < MIN_ACQUISTI) continue; // troppo poche occorrenze per fidarsi
    if (giaInLista.has(chiave)) continue; // già in lista, non serve suggerirlo
    if (eIgnorato(chiave, dismissed, ora)) continue; // l'utente l'ha già scartato

    const intervalli = [];
    for (let i = 1; i < occorrenze.length; i++) {
      intervalli.push(giorniTra(occorrenze[i - 1].data_archiviazione, occorrenze[i].data_archiviazione));
    }

    const intervalloMedio = media(intervalli);
    const cv = coefficienteVariazione(intervalli);
    const ultima = occorrenze[occorrenze.length - 1];
    const giorniDaUltimo = giorniTra(ultima.data_archiviazione, ora);

    const regolare = cv <= MAX_COEFF_VARIAZIONE;
    // Fallback per pattern "frequente ma irregolare": ≥2 occorrenze negli ultimi 60 giorni.
    const recenteEFrequente =
      !regolare && occorrenze.filter((o) => giorniTra(o.data_archiviazione, ora) <= 60).length >= 2;

    if (!regolare && !recenteEFrequente) continue; // troppo irregolare: lampadine, batterie...
    if (giorniDaUltimo < intervalloMedio * SOGLIA_RITARDO) continue; // comprato troppo di recente

    candidati.push({
      prodottoNormalizzato: chiave,
      prodotto: ultima.prodotto, // mantiene la capitalizzazione originale per la UI
      categoria: ultima.categoria,
      negozio: ultima.negozio,
      intervalloMedio: Math.round(intervalloMedio),
      giorniDaUltimo,
      regolare,
      motivo: regolare
        ? `Lo compri circa ogni ${Math.round(intervalloMedio)} giorni.`
        : "Lo compri spesso in questo periodo.",
    });
  }

  // Prima i più "in ritardo" rispetto al proprio ritmo abituale.
  candidati.sort((a, b) => (b.giorniDaUltimo / b.intervalloMedio || 0) - (a.giorniDaUltimo / a.intervalloMedio || 0));

  return candidati.slice(0, MAX_SUGGERIMENTI);
}
