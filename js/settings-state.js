// js/settings-state.js
// Stato in memoria della sezione Impostazioni globale (categorie
// alimento + supermercati). Stesso pattern di state.js/mealplan-state.js:
// specchio locale per il rendering, la fonte di verità resta Supabase.

const state = {
  categorie: [],
  supermercati: [],
};

export function setCategorie(c) { state.categorie = c; }
export function getCategorie() { return state.categorie; }

export function setSupermercati(s) { state.supermercati = s; }
export function getSupermercati() { return state.supermercati; }
