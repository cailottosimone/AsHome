// js/app.js
// Coordina stato (state.js), backend (api.js) e interfaccia (ui.js)
// della lista della spesa. Si avvia con init(casaId), chiamato da
// main.js una volta che si sa in quale Casa si trova l'utente.

import * as api from "./api.js";
import * as state from "./state.js";
import * as ui from "./ui.js";
import * as settingsApi from "./settings-api.js"; // solo per leggere i supermercati e alimentare il suggerimento sul campo "Negozio"
import { calcolaSuggerimenti } from "./suggestions.js";
import { SUGGESTION_RULES } from "./config.js";

let casaIdCorrente = null;

// Callback opzionale invocato dopo un salvataggio riuscito di un NUOVO
// prodotto (non una modifica). Serve a un solo scopo: quando il Piano
// Alimentare apre questo stesso modale per un alimento "mancante" (vedi
// apriModaleNuovoProdotto), deve sapere quando il salvataggio è andato a
// buon fine per rimuovere la riga corrispondente dalla sua checklist.
// Nessun altro punto dell'app la usa.
let onNuovoProdottoSalvato = null;

function renderAll() {
  ui.renderFilters();
  ui.renderList();
  ui.renderHistory();
  ui.renderSuggestions();
}

/** Ricalcola i suggerimenti dallo stato già caricato (nessuna chiamata di rete). */
function refreshSuggestions() {
  const suggestions = calcolaSuggerimenti(
    state.getArchivedItems(),
    state.getActiveItems(),
    state.getDismissedSuggestions()
  );
  state.setSuggestions(suggestions);
  ui.renderSuggestions();
}

async function loadItems() {
  ui.showLoading(true);
  try {
    const items = await api.fetchItems(casaIdCorrente);
    state.setItems(items);
    renderAll();
    refreshSuggestions();
  } catch (err) {
    console.error("Errore nel caricamento della lista:", err);
  } finally {
    ui.showLoading(false);
  }
}

async function loadDismissedSuggestions() {
  try {
    const rows = await api.fetchDismissedSuggestions(casaIdCorrente);
    state.setDismissedSuggestions(rows);
    refreshSuggestions();
  } catch (err) {
    console.error("Errore nel caricamento dei suggerimenti ignorati:", err);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const editingId = state.getEditingItemId();
  const resetButton = ui.setSubmitLoading(Boolean(editingId));
  const itemData = ui.readForm();

  if (!itemData.prodotto) {
    resetButton();
    return;
  }

  try {
    if (editingId) {
      await api.updateItem(editingId, itemData);
    } else {
      await api.createItem(itemData, casaIdCorrente);
    }
    ui.els.addForm.reset();
    ui.closeModal();
    if (!editingId && onNuovoProdottoSalvato) {
      const callback = onNuovoProdottoSalvato;
      onNuovoProdottoSalvato = null;
      callback();
    }
    await loadItems();
  } catch (err) {
    alert("Errore durante il salvataggio: " + err.message);
  } finally {
    resetButton();
  }
}

async function handleToggle(id, currentState) {
  const nextState = !currentState;
  // Aggiornamento ottimistico: l'interfaccia reagisce subito,
  // fetchItems() la riallineerà comunque via realtime.
  const item = state.findActiveItem(id);
  if (item) item.acquistato = nextState;
  ui.renderList();

  try {
    await api.setPurchased(id, nextState);
  } catch (err) {
    console.error("Errore nell'aggiornamento:", err);
    await loadItems();
  }
}

async function handleDelete(id) {
  if (!confirm("Eliminare questo articolo?")) return;
  try {
    await api.deleteItem(id);
    await loadItems();
  } catch (err) {
    alert("Errore durante l'eliminazione: " + err.message);
  }
}

function handleEdit(id) {
  const item = state.findActiveItem(id);
  if (!item) return;
  state.setEditingItemId(id);
  ui.openModal(item);
}

function handleOpenAdd() {
  state.setEditingItemId(null);
  ui.openModal();
}

function handleCloseModal() {
  // Se si chiude senza salvare, un eventuale callback in sospeso (vedi
  // apriModaleNuovoProdotto) non deve scattare su un salvataggio futuro e scollegato.
  onNuovoProdottoSalvato = null;
  ui.closeModal();
}

/**
 * Apre il modale "Nuovo Prodotto" precompilato con un nome, e registra
 * un callback da eseguire dopo il salvataggio riuscito. Unico punto di
 * integrazione con il Piano Alimentare: usato da "Cosa mi manca" per
 * far seguire all'alimento mancante lo stesso flusso normale di
 * inserimento (quantità, negozio, note, categoria) invece di inserirlo
 * a raffica con campi vuoti.
 */
export function apriModaleNuovoProdotto(nomePrecompilato, onSalvato) {
  state.setEditingItemId(null);
  ui.openModal();
  ui.els.inputProdotto.value = nomePrecompilato;
  onNuovoProdottoSalvato = onSalvato ?? null;
}

async function handleFinishShopping() {
  const completed = state.getActiveItems().filter((i) => i.acquistato);
  if (completed.length === 0) {
    alert("Spunta prima gli articoli acquistati per poter finire la spesa!");
    return;
  }
  if (!confirm(`Vuoi completare la spesa e archiviare ${completed.length} articoli nello storico?`)) return;

  try {
    await api.archiveItems(completed.map((i) => i.id));
    await loadItems();
  } catch (err) {
    alert("Errore nell'archiviazione: " + err.message);
    await loadItems();
  }
}

async function handleRestore(id) {
  try {
    await api.restoreItem(id);
    await loadItems();
  } catch (err) {
    alert("Errore durante il ripristino: " + err.message);
  }
}

async function handleClearHistory() {
  const archived = state.getArchivedItems();
  if (archived.length === 0) return;
  if (!confirm("Sei sicuro di voler eliminare DEFINITIVAMENTE tutto lo storico?")) return;

  try {
    await api.deleteItems(archived.map((i) => i.id));
    await loadItems();
  } catch (err) {
    alert("Errore durante la cancellazione dello storico: " + err.message);
  }
}

/** Un suggerimento accettato diventa un articolo normale in lista,
 *  riusando categoria e negozio dell'ultima occorrenza — nessun input
 *  aggiuntivo richiesto all'utente. */
async function handleSuggestionAdd(chiave) {
  const suggestion = state.findSuggestion(chiave);
  if (!suggestion) return;

  try {
    await api.createItem({
      prodotto: suggestion.prodotto,
      quantita: "",
      categoria: suggestion.categoria || "Altro",
      negozio: suggestion.negozio || "Generale",
      note: "",
    }, casaIdCorrente);
    await loadItems();
  } catch (err) {
    alert("Errore durante l'aggiunta: " + err.message);
  }
}

async function handleSuggestionSnooze(chiave) {
  try {
    await api.snoozeSuggestion(chiave, SUGGESTION_RULES.SNOOZE_GIORNI, casaIdCorrente);
    await loadDismissedSuggestions();
  } catch (err) {
    console.error("Errore nello snooze del suggerimento:", err);
  }
}

async function handleSuggestionDismiss(chiave) {
  try {
    await api.dismissSuggestionForever(chiave, casaIdCorrente);
    await loadDismissedSuggestions();
  } catch (err) {
    console.error("Errore nel dismiss del suggerimento:", err);
  }
}

/** Un solo listener sul body: instrada i click in base a data-action. */
function bindEvents() {
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, id, shop, current } = target.dataset;

    switch (action) {
      case "open-add": return handleOpenAdd();
      case "close-modal": return handleCloseModal();
      case "open-history": return ui.openHistoryModal();
      case "close-history-modal": return ui.closeHistoryModal();
      case "finish-shopping": return handleFinishShopping();
      case "clear-history": return handleClearHistory();
      case "filter-shop":
        state.setShop(shop);
        ui.renderFilters();
        ui.renderList();
        return;
      case "toggle": return handleToggle(id, current === "true");
      case "edit": return handleEdit(id);
      case "delete": return handleDelete(id);
      case "restore": return handleRestore(id);
      case "suggestion-add": return handleSuggestionAdd(target.dataset.key);
      case "suggestion-snooze": return handleSuggestionSnooze(target.dataset.key);
      case "suggestion-dismiss": return handleSuggestionDismiss(target.dataset.key);
    }
  });

  ui.els.addForm.addEventListener("submit", handleFormSubmit);
}

async function loadSupermercati(casaId) {
  const supermercati = await settingsApi.fetchSupermercati(casaId);
  ui.renderDatalistSupermercati(supermercati);
}

/** Avvia la lista della spesa per la Casa indicata. Chiamato da main.js
 *  una volta risolti login e appartenenza a una Casa. */
export async function init(casaId) {
  casaIdCorrente = casaId;
  ui.populateCategorySelect();
  bindEvents();
  await loadItems();
  await loadDismissedSuggestions();
  await loadSupermercati(casaId);
  api.subscribeRealtime(casaId, loadItems);
  api.subscribeSuggestionsRealtime(casaId, loadDismissedSuggestions);
  settingsApi.subscribeSettingsRealtime(casaId, () => loadSupermercati(casaId));
}
