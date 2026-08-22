// js/settings-ui.js
// Rendering DOM della sezione Impostazioni globale. Nessuna chiamata
// di rete: riceve dati già pronti da settings-app.js.

import * as state from "./settings-state.js";

export const els = {
  listaCategorieImpostazioni: document.getElementById("listaCategorieImpostazioniGlobali"),
  contaCategorie: document.getElementById("contaCategorieImpostazioniGlobali"),
  listaSupermercati: document.getElementById("listaSupermercati"),
  contaSupermercati: document.getElementById("contaSupermercati"),
};

const escapeHtml = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

export function renderListaCategorie() {
  const categorie = state.getCategorie();
  els.listaCategorieImpostazioni.innerHTML = categorie.length === 0
    ? `<p class="text-sm text-slate-400 text-center py-4">Nessuna categoria ancora.</p>`
    : categorie.map((c) => `
        <div class="px-3.5 py-2 flex items-center justify-between gap-2 bg-white">
          <span class="text-sm text-slate-800">${escapeHtml(c.nome)}</span>
          <button type="button" data-action="elimina-categoria-globale" data-categoria-id="${c.id}" data-nome="${escapeHtml(c.nome)}"
            class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      `).join("");
  els.contaCategorie.textContent = `(${categorie.length})`;
}

export function renderListaSupermercati() {
  const supermercati = state.getSupermercati();
  els.listaSupermercati.innerHTML = supermercati.length === 0
    ? `<p class="text-sm text-slate-400 text-center py-4">Nessun supermercato ancora.</p>`
    : supermercati.map((s) => `
        <div class="px-3.5 py-2 flex items-center justify-between gap-2 bg-white">
          <span class="text-sm text-slate-800">${escapeHtml(s.nome)}</span>
          <button type="button" data-action="elimina-supermercato" data-supermercato-id="${s.id}" data-nome="${escapeHtml(s.nome)}"
            class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      `).join("");
  els.contaSupermercati.textContent = `(${supermercati.length})`;
}
