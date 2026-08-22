// js/settings-app.js
// Orchestra stato (settings-state.js), backend (settings-api.js +
// mealplan-api.js per le categorie, riusate senza duplicarle) e
// interfaccia (settings-ui.js) della sezione Impostazioni globale —
// condivisa tra Lista Spesa e Piano Alimentare, non annidata in nessuna
// delle due.

import * as settingsApi from "./settings-api.js";
import * as mealplanApi from "./mealplan-api.js"; // riuso fetchCategorie/createCategoria/deleteCategoria: nate per il Piano Alimentare, ma senza legami che ne impediscano il riuso qui
import * as state from "./settings-state.js";
import * as ui from "./settings-ui.js";
import { getCasaId } from "./session-state.js";

async function ricaricaCategorie() {
  const categorie = await mealplanApi.fetchCategorie();
  state.setCategorie(categorie);
  ui.renderListaCategorie();
}

async function ricaricaSupermercati() {
  const supermercati = await settingsApi.fetchSupermercati(getCasaId());
  state.setSupermercati(supermercati);
  ui.renderListaSupermercati();
}

async function ricaricaTutto() {
  await Promise.all([ricaricaCategorie(), ricaricaSupermercati()]);
}

async function handleApriNuovaCategoria() {
  const nome = prompt("Nome della nuova categoria:");
  if (!nome || !nome.trim()) return;
  try {
    await mealplanApi.createCategoria(nome.trim());
    await ricaricaCategorie();
  } catch (err) {
    alert("Errore nell'aggiungere la categoria: " + err.message);
  }
}

async function handleEliminaCategoria(categoriaId, nome) {
  if (!confirm(`Eliminare "${nome}"? È condivisa tra tutte le Case: sparirà da ogni alimento e template che la usa, ovunque.`)) return;
  try {
    await mealplanApi.deleteCategoria(categoriaId);
    await ricaricaCategorie();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

async function handleApriNuovoSupermercato() {
  const nome = prompt("Nome del supermercato:");
  if (!nome || !nome.trim()) return;
  try {
    await settingsApi.createSupermercato(getCasaId(), nome.trim());
    await ricaricaSupermercati();
  } catch (err) {
    alert("Errore nell'aggiungere il supermercato: " + err.message);
  }
}

async function handleEliminaSupermercato(supermercatoId, nome) {
  if (!confirm(`Eliminare "${nome}" dai supermercati della Casa?`)) return;
  try {
    await settingsApi.deleteSupermercato(supermercatoId);
    await ricaricaSupermercati();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

function bindEventi() {
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, categoriaId, supermercatoId, nome } = target.dataset;

    switch (action) {
      case "apri-nuova-categoria-globale": return handleApriNuovaCategoria();
      case "elimina-categoria-globale": return handleEliminaCategoria(categoriaId, nome);
      case "apri-nuovo-supermercato": return handleApriNuovoSupermercato();
      case "elimina-supermercato": return handleEliminaSupermercato(supermercatoId, nome);
    }
  });
}

export async function init(casaId) {
  bindEventi();
  await ricaricaTutto();
  settingsApi.subscribeSettingsRealtime(casaId, () => ricaricaSupermercati());
}
