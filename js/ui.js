// js/ui.js
// Tutte le funzioni che leggono/scrivono il DOM vivono qui. Nessuna di
// queste chiama Supabase direttamente: ricevono dati già pronti da
// app.js, che fa da collante fra stato, API e interfaccia.

import { CATEGORIE } from "./config.js";
import { getVisibleItems, getArchivedItems, getShops, getCurrentShop } from "./state.js";

export const els = {
  loading: document.getElementById("loading"),
  listContainer: document.getElementById("listContainer"),
  emptyState: document.getElementById("emptyState"),
  shopFilters: document.getElementById("shopFilters"),

  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  addForm: document.getElementById("addForm"),
  btnSubmit: document.getElementById("btnSubmit"),
  inputProdotto: document.getElementById("inputProdotto"),
  inputQuantita: document.getElementById("inputQuantita"),
  inputCategoria: document.getElementById("inputCategoria"),
  inputNegozio: document.getElementById("inputNegozio"),
  inputNote: document.getElementById("inputNote"),

  historyModal: document.getElementById("historyModal"),
  historyListContainer: document.getElementById("historyListContainer"),
};

const escapeHtml = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

export function populateCategorySelect() {
  els.inputCategoria.innerHTML = CATEGORIE.map(
    (c) => `<option value="${c.value}" ${c.value === "Altro" ? "selected" : ""}>${c.emoji} ${c.value}</option>`
  ).join("");
}

export function showLoading(show) {
  els.loading.classList.toggle("hidden", !show);
  if (show) els.listContainer.classList.add("hidden");
}

export function renderFilters() {
  const shops = getShops();
  const current = getCurrentShop();

  els.shopFilters.innerHTML = shops.map((shop) => `
    <button type="button" data-action="filter-shop" data-shop="${escapeHtml(shop)}"
      class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${current === shop ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}">
      <i class="fa-solid ${shop === "Tutti" ? "fa-border-all" : "fa-store"} text-[10px]"></i>
      ${escapeHtml(shop)}
    </button>
  `).join("");
}

export function renderList() {
  const filtered = getVisibleItems();

  if (filtered.length === 0) {
    els.listContainer.classList.add("hidden");
    els.emptyState.classList.remove("hidden");
    return;
  }

  els.emptyState.classList.add("hidden");
  els.listContainer.classList.remove("hidden");

  const grouped = filtered.reduce((acc, item) => {
    const cat = item.categoria || "Altro";
    (acc[cat] ??= []).push(item);
    return acc;
  }, {});

  els.listContainer.innerHTML = Object.keys(grouped).map((cat) => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div class="bg-slate-50/80 px-3.5 py-2 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <i class="fa-solid fa-layer-group text-indigo-500"></i> ${escapeHtml(cat)}
      </div>
      <div class="divide-y divide-slate-100">
        ${grouped[cat].map(renderItemRow).join("")}
      </div>
    </div>
  `).join("");
}

function renderItemRow(item) {
  return `
    <div class="p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors ${item.acquistato ? "bg-slate-50/80 opacity-60" : "hover:bg-slate-50/50"}">

      <div class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" data-action="toggle" data-id="${item.id}" data-current="${item.acquistato}">
        <input type="checkbox" ${item.acquistato ? "checked" : ""} class="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none flex-shrink-0">

        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 leading-tight">
          <span class="font-semibold text-sm sm:text-base ${item.acquistato ? "line-through text-slate-400" : "text-slate-800"}">
            ${escapeHtml(item.prodotto)}
          </span>

          ${item.quantita ? `<span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-semibold">${escapeHtml(item.quantita)}</span>` : ""}
          ${item.negozio ? `<span class="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1"><i class="fa-solid fa-store text-[10px]"></i>${escapeHtml(item.negozio)}</span>` : ""}
          ${item.note ? `<span class="text-xs text-slate-500 italic flex items-center gap-1 truncate max-w-[180px] sm:max-w-none"><i class="fa-regular fa-note-sticky text-[10px]"></i>${escapeHtml(item.note)}</span>` : ""}
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0">
        <button type="button" data-action="edit" data-id="${item.id}" class="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 transition" title="Modifica">
          <i class="fa-solid fa-pen text-xs sm:text-sm"></i>
        </button>
        <button type="button" data-action="delete" data-id="${item.id}" class="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-slate-100 transition" title="Elimina">
          <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
        </button>
      </div>
    </div>
  `;
}

export function renderHistory() {
  const archived = getArchivedItems();

  if (archived.length === 0) {
    els.historyListContainer.innerHTML = `<p class="text-center text-xs text-slate-400 py-8">Lo storico è vuoto.</p>`;
    return;
  }

  els.historyListContainer.innerHTML = archived.map((item) => {
    const dateFormatted = item.data_archiviazione
      ? new Date(item.data_archiviazione).toLocaleString("it-IT", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "";

    return `
      <div class="py-2.5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <span class="text-xs sm:text-sm font-semibold text-slate-700 line-through">${escapeHtml(item.prodotto)}</span>

          <div class="text-[10px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mt-1">
            ${item.quantita ? `<span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">${escapeHtml(item.quantita)}</span>` : ""}
            <span class="text-slate-400">${escapeHtml(item.categoria || "Altro")}</span>

            ${item.negozio ? `
              <span class="text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <i class="fa-solid fa-store text-[9px]"></i> ${escapeHtml(item.negozio)}
              </span>
            ` : ""}

            ${item.note ? `
              <span class="text-slate-500 italic flex items-center gap-1">
                <i class="fa-regular fa-note-sticky text-[9px]"></i> ${escapeHtml(item.note)}
              </span>
            ` : ""}

            ${dateFormatted ? `
              <span class="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                <i class="fa-regular fa-calendar-check text-[9px]"></i> ${dateFormatted}
              </span>
            ` : ""}
          </div>
        </div>

        <button type="button" data-action="restore" data-id="${item.id}" class="text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0" title="Riporta in lista">
          <i class="fa-solid fa-arrow-rotate-left text-[10px]"></i> Ripristina
        </button>
      </div>
    `;
  }).join("");
}

/** Legge i valori correnti del form di aggiunta/modifica. */
export function readForm() {
  return {
    prodotto: els.inputProdotto.value.trim(),
    quantita: els.inputQuantita.value.trim(),
    categoria: els.inputCategoria.value,
    negozio: els.inputNegozio.value.trim() || "Generale",
    note: els.inputNote.value.trim(),
  };
}

export function openModal(item = null) {
  if (item) {
    els.inputProdotto.value = item.prodotto || "";
    els.inputQuantita.value = item.quantita || "";
    els.inputCategoria.value = item.categoria || "Altro";
    els.inputNegozio.value = item.negozio || "";
    els.inputNote.value = item.note || "";

    els.modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-600"></i> Modifica Prodotto';
    els.btnSubmit.innerText = "Aggiorna";
  } else {
    els.addForm.reset();
    els.modalTitle.innerHTML = '<i class="fa-solid fa-cart-plus text-indigo-600"></i> Nuovo Prodotto';
    els.btnSubmit.innerText = "Salva";
  }

  els.modal.classList.remove("hidden");
  els.inputProdotto.focus();
}

export function closeModal() {
  els.modal.classList.add("hidden");
}

export function setSubmitLoading(isEditing) {
  els.btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvo...';
  els.btnSubmit.disabled = true;
  return () => {
    els.btnSubmit.innerText = isEditing ? "Aggiorna" : "Salva";
    els.btnSubmit.disabled = false;
  };
}

export function openHistoryModal() {
  els.historyModal.classList.remove("hidden");
}

export function closeHistoryModal() {
  els.historyModal.classList.add("hidden");
}
