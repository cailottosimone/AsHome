// js/app.js
// Punto di ingresso dell'app. Coordina stato (state.js), backend (api.js)
// e interfaccia (ui.js); non contiene logica di rendering o di accesso dati.

import * as api from "./api.js";
import * as state from "./state.js";
import * as ui from "./ui.js";

function renderAll() {
  ui.renderFilters();
  ui.renderList();
  ui.renderHistory();
}

async function loadItems() {
  ui.showLoading(true);
  try {
    const items = await api.fetchItems();
    state.setItems(items);
    renderAll();
  } catch (err) {
    console.error("Errore nel caricamento della lista:", err);
  } finally {
    ui.showLoading(false);
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
      await api.createItem(itemData);
    }
    ui.els.addForm.reset();
    ui.closeModal();
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

/** Un solo listener sul body: instrada i click in base a data-action. */
function bindEvents() {
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, id, shop, current } = target.dataset;

    switch (action) {
      case "open-add": return handleOpenAdd();
      case "close-modal": return ui.closeModal();
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
    }
  });

  ui.els.addForm.addEventListener("submit", handleFormSubmit);
}

document.addEventListener("DOMContentLoaded", () => {
  ui.populateCategorySelect();
  bindEvents();
  loadItems();
  api.subscribeRealtime(loadItems);
});
