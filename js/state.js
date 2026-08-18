// js/state.js
// Stato dell'applicazione in memoria. Nessuna persistenza propria:
// la fonte di verità resta Supabase, questo è solo lo specchio locale
// usato per renderizzare l'interfaccia senza richieste continue.

const state = {
  allItems: [],
  currentShop: "Tutti",
  editingItemId: null,
};

export function setItems(items) {
  state.allItems = items;
}

export function getAllItems() {
  return state.allItems;
}

export function getActiveItems() {
  return state.allItems.filter((i) => !i.archiviato);
}

export function getArchivedItems() {
  return state.allItems.filter((i) => i.archiviato);
}

export function getVisibleItems() {
  const active = getActiveItems();
  if (state.currentShop === "Tutti") return active;
  return active.filter((i) => i.negozio === state.currentShop);
}

export function getShops() {
  const shops = new Set(getActiveItems().map((i) => i.negozio).filter(Boolean));
  return ["Tutti", ...shops];
}

export function setShop(shop) {
  state.currentShop = shop;
}

export function getCurrentShop() {
  return state.currentShop;
}

export function setEditingItemId(id) {
  state.editingItemId = id;
}

export function getEditingItemId() {
  return state.editingItemId;
}

export function findActiveItem(id) {
  return getActiveItems().find((i) => i.id === id);
}
