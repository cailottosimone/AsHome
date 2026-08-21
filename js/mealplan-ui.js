// js/mealplan-ui.js
// Tutto il rendering DOM del Piano Alimentare. Nessuna chiamata di rete:
// riceve dati già pronti da mealplan-app.js, come ui.js fa per la lista spesa.
//
// La visibilità dell'intera sotto-app (Piano Alimentare vs Lista Spesa)
// è gestita da main.js, non da qui: questo modulo si occupa solo di
// cosa succede DENTRO il Piano Alimentare (le sue sotto-viste interne).

import { GIORNI_SETTIMANA } from "./config.js";
import * as state from "./mealplan-state.js";

export const els = {
  tabButtons: document.querySelectorAll('[data-action="sotto-vista"]'),

  sottoVistaPiano: document.getElementById("sottoVistaPiano"),
  sottoVistaDispensa: document.getElementById("sottoVistaDispensa"),
  sottoVistaTemplate: document.getElementById("sottoVistaTemplate"),
  sottoVistaMancanti: document.getElementById("sottoVistaMancanti"),
  sottoVistaImpostazioni: document.getElementById("sottoVistaImpostazioni"),

  selectPianoCorrente: document.getElementById("selectPianoCorrente"),
  menuNuovoPiano: document.getElementById("menuNuovoPiano"),
  grigliaGiorniPasti: document.getElementById("grigliaGiorniPasti"),
  pianoVuotoState: document.getElementById("pianoVuotoState"),

  formNuovoAlimento: document.getElementById("formNuovoAlimento"),
  inputNomeAlimento: document.getElementById("inputNomeAlimento"),
  chipCategorieNuovoAlimento: document.getElementById("chipCategorieNuovoAlimento"),
  listaAlimenti: document.getElementById("listaAlimenti"),

  listaMancanti: document.getElementById("listaMancanti"),

  listaCategorieImpostazioni: document.getElementById("listaCategorieImpostazioni"),
  formNuovaCategoria: document.getElementById("formNuovaCategoria"),
  inputNuovaCategoria: document.getElementById("inputNuovaCategoria"),
  listaTemplate: document.getElementById("listaTemplate"),

  modalScegliAlimento: document.getElementById("modalScegliAlimento"),
  modalScegliAlimentoTitolo: document.getElementById("modalScegliAlimentoTitolo"),
  listaScegliAlimento: document.getElementById("listaScegliAlimento"),

  modalCompilaTemplate: document.getElementById("modalCompilaTemplate"),
  selectTemplateDaUsare: document.getElementById("selectTemplateDaUsare"),
  inputNomeNuovoPianoDaTemplate: document.getElementById("inputNomeNuovoPianoDaTemplate"),

  modalCompilaPrecedente: document.getElementById("modalCompilaPrecedente"),
  selectPianoOrigine: document.getElementById("selectPianoOrigine"),
  inputNomeNuovoPianoDaPrecedente: document.getElementById("inputNomeNuovoPianoDaPrecedente"),

  modalNuovoTemplate: document.getElementById("modalNuovoTemplate"),
  nuovoTemplateStep1: document.getElementById("nuovoTemplateStep1"),
  inputNomeNuovoTemplate: document.getElementById("inputNomeNuovoTemplate"),
  nuovoTemplateGriglia: document.getElementById("nuovoTemplateGriglia"),
  btnFineNuovoTemplate: document.getElementById("btnFineNuovoTemplate"),

  modalScegliCategoriaTemplate: document.getElementById("modalScegliCategoriaTemplate"),
  listaScegliCategoriaTemplate: document.getElementById("listaScegliCategoriaTemplate"),
};

const escapeHtml = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

/* ── Navigazione interna (sotto-viste) ── */

const SOTTO_VISTE = ["piano", "dispensa", "template", "mancanti", "impostazioni"];

export function mostraSottoVista(vista) {
  state.setSottoVista(vista);
  els.sottoVistaPiano.classList.toggle("hidden", vista !== "piano");
  els.sottoVistaDispensa.classList.toggle("hidden", vista !== "dispensa");
  els.sottoVistaTemplate.classList.toggle("hidden", vista !== "template");
  els.sottoVistaMancanti.classList.toggle("hidden", vista !== "mancanti");
  els.sottoVistaImpostazioni.classList.toggle("hidden", vista !== "impostazioni");

  els.tabButtons.forEach((btn) => {
    const attiva = btn.dataset.vista === vista;
    btn.classList.toggle("text-indigo-600", attiva);
    btn.classList.toggle("border-indigo-600", attiva);
    btn.classList.toggle("text-slate-400", !attiva);
    btn.classList.toggle("border-transparent", !attiva);
  });
}

export function toggleMenuNuovoPiano() {
  els.menuNuovoPiano.classList.toggle("hidden");
}

export function chiudiMenuNuovoPiano() {
  els.menuNuovoPiano.classList.add("hidden");
}

/* ── Selettore piano corrente ── */

export function renderSelectPiani() {
  const piani = state.getPiani();
  const correnteId = state.getPianoCorrenteId();

  if (piani.length === 0) {
    els.selectPianoCorrente.innerHTML = `<option value="">Nessun piano ancora</option>`;
    return;
  }

  els.selectPianoCorrente.innerHTML = piani
    .map((p) => `<option value="${p.id}" ${p.id === correnteId ? "selected" : ""}>${escapeHtml(p.nome)}</option>`)
    .join("");
}

/* ── Griglia giorni/pasti del piano corrente ── */

export function renderGrigliaPiano() {
  const struttura = state.getStrutturaPianoCorrente();

  if (!state.getPianoCorrenteId() || struttura.length === 0) {
    els.grigliaGiorniPasti.innerHTML = "";
    els.pianoVuotoState.classList.remove("hidden");
    return;
  }
  els.pianoVuotoState.classList.add("hidden");

  els.grigliaGiorniPasti.innerHTML = struttura.map((giorno) => `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div class="bg-slate-50/80 px-3 py-1.5 border-b border-slate-100 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
        ${GIORNI_SETTIMANA[giorno.giorno_settimana]}
      </div>
      <div class="divide-y divide-slate-100">
        ${(giorno.piano_pasti ?? [])
          .slice()
          .sort((a, b) => (a.tipi_pasto?.ordine ?? 0) - (b.tipi_pasto?.ordine ?? 0))
          .map((pasto) => renderRigaPasto(pasto))
          .join("")}
      </div>
    </div>
  `).join("");
}

function renderChipAlimenti(alimenti) {
  if (alimenti.length === 0) return `<span class="text-xs text-slate-400 italic">Nessun alimento</span>`;
  return `<div class="flex flex-wrap gap-1">${alimenti.map((a) => `
    <span class="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 pl-2 pr-1 py-0.5 rounded-lg font-medium">
      ${escapeHtml(a.alimenti?.nome ?? "")}
      <button type="button" data-action="rimuovi-alimento-da-pasto" data-riga-id="${a.id}"
        class="text-slate-400 hover:text-red-500 w-3.5 h-3.5 flex items-center justify-center">
        <i class="fa-solid fa-xmark text-[9px]"></i>
      </button>
    </span>
  `).join("")}</div>`;
}

function renderBottonePiu(pastoId, categoriaId) {
  return `
    <button type="button" data-action="apri-scegli-alimento" data-pasto-id="${pastoId}" ${categoriaId ? `data-categoria-id="${categoriaId}"` : ""}
      class="text-indigo-600 hover:bg-indigo-50 w-5 h-5 rounded-full flex items-center justify-center transition flex-shrink-0" title="Aggiungi">
      <i class="fa-solid fa-plus text-[10px]"></i>
    </button>
  `;
}

function renderRigaPasto(pasto) {
  const nomeTipo = pasto.tipi_pasto?.nome ?? "";
  const sezioni = pasto.piano_pasto_categorie ?? [];
  const alimenti = pasto.piano_pasto_alimenti ?? [];

  if (sezioni.length === 0) {
    // Pasto "libero" (piano creato vuoto, o senza sezioni): lista piatta, un solo "+".
    return `
      <div class="p-2 sm:p-2.5">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">${escapeHtml(nomeTipo)}</span>
          ${renderBottonePiu(pasto.id, null)}
        </div>
        ${renderChipAlimenti(alimenti)}
      </div>
    `;
  }

  // Pasto strutturato da un template: una sotto-sezione per categoria
  // attesa, ciascuna col proprio "+" che propone solo gli alimenti
  // della dispensa che appartengono a quella categoria.
  const alimentiSenzaSezione = alimenti.filter((a) => !sezioni.some((s) => s.categoria_id === a.categoria_id));

  return `
    <div class="p-2 sm:p-2.5 space-y-2">
      <div class="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">${escapeHtml(nomeTipo)}</div>
      ${sezioni.map((sez) => `
        <div class="pl-2.5 border-l-2 border-slate-200">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs font-semibold text-slate-600">${escapeHtml(sez.categorie_alimento?.nome ?? "")}</span>
            ${renderBottonePiu(pasto.id, sez.categoria_id)}
          </div>
          ${renderChipAlimenti(alimenti.filter((a) => a.categoria_id === sez.categoria_id))}
        </div>
      `).join("")}
      ${alimentiSenzaSezione.length ? `
        <div class="pl-2.5 border-l-2 border-slate-200">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="text-xs font-semibold text-slate-400">Altro</span>
            ${renderBottonePiu(pasto.id, null)}
          </div>
          ${renderChipAlimenti(alimentiSenzaSezione)}
        </div>
      ` : ""}
    </div>
  `;
}

/* ── Modal: scegli alimento per un pasto (o per una sua sezione-categoria) ── */

export function apriSceltaAlimento(pastoId, tipoPastoNome, categoriaId, categoriaNome) {
  els.modalScegliAlimentoTitolo.textContent = categoriaNome
    ? `Aggiungi a ${tipoPastoNome} · ${categoriaNome}`
    : `Aggiungi a ${tipoPastoNome}`;

  let alimenti = state.getAlimenti();
  if (categoriaId) {
    alimenti = alimenti.filter((a) => a.categorie.some((c) => c.id === categoriaId));
  }

  els.listaScegliAlimento.innerHTML = alimenti.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-4">${
        categoriaId ? "Nessun alimento di questa categoria in dispensa." : "La dispensa è vuota — aggiungi prima qualche alimento."
      }</p>`
    : alimenti.map((a) => `
        <button type="button" data-action="scegli-alimento-per-pasto" data-pasto-id="${pastoId}" data-alimento-id="${a.id}" ${categoriaId ? `data-categoria-id="${categoriaId}"` : ""}
          class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-700 transition">
          ${escapeHtml(a.nome)}
          ${!categoriaId && a.categorie.length ? `<span class="text-xs text-slate-400 ml-1">(${a.categorie.map((c) => escapeHtml(c.nome)).join(", ")})</span>` : ""}
        </button>
      `).join("");

  els.modalScegliAlimento.classList.remove("hidden");
}

export function chiudiSceltaAlimento() {
  els.modalScegliAlimento.classList.add("hidden");
}

/* ── Chip di selezione categorie (dispensa e builder di template) ── */

export function renderChipCategorieNuovoAlimento() {
  const categorie = state.getCategorie();
  els.chipCategorieNuovoAlimento.innerHTML = categorie.map((c) => `
    <button type="button" data-action="toggle-categoria-chip" data-categoria-id="${c.id}" data-selected="false"
      class="chip-categoria px-3 py-1.5 rounded-full text-xs font-semibold border transition bg-white text-slate-600 border-slate-300 hover:border-indigo-400">
      ${escapeHtml(c.nome)}
    </button>
  `).join("");
}

export function leggiCategorieSelezionate(container) {
  return Array.from(container.querySelectorAll('[data-selected="true"]')).map((el) => el.dataset.categoriaId);
}

export function toggleChipCategoria(chip) {
  const attiva = chip.dataset.selected === "true";
  chip.dataset.selected = String(!attiva);
  chip.classList.toggle("bg-indigo-600", !attiva);
  chip.classList.toggle("text-white", !attiva);
  chip.classList.toggle("border-indigo-600", !attiva);
  chip.classList.toggle("bg-white", attiva);
  chip.classList.toggle("text-slate-600", attiva);
  chip.classList.toggle("border-slate-300", attiva);
}

/* ── Dispensa: lista raggruppata per categoria ── */

export function renderListaAlimenti() {
  const alimenti = state.getAlimenti();

  if (alimenti.length === 0) {
    els.listaAlimenti.innerHTML = `<p class="text-xs text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-200/80">Nessun alimento in dispensa ancora.</p>`;
    return;
  }

  const gruppi = new Map();
  const senzaCategoria = [];
  for (const a of alimenti) {
    if (a.categorie.length === 0) { senzaCategoria.push(a); continue; }
    for (const c of a.categorie) {
      if (!gruppi.has(c.nome)) gruppi.set(c.nome, []);
      gruppi.get(c.nome).push(a);
    }
  }
  if (senzaCategoria.length) gruppi.set("Senza categoria", senzaCategoria);

  els.listaAlimenti.innerHTML = Array.from(gruppi.entries())
    .sort(([a], [b]) => (a === "Senza categoria" ? 1 : b === "Senza categoria" ? -1 : a.localeCompare(b)))
    .map(([nomeCategoria, elenco]) => `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div class="bg-slate-50/80 px-3 py-1.5 border-b border-slate-100 font-bold text-[11px] text-slate-500 uppercase tracking-wider">
          ${escapeHtml(nomeCategoria)}
        </div>
        <div class="divide-y divide-slate-100">
          ${elenco.map((a) => `
            <div class="px-3 py-2 flex items-center justify-between gap-2">
              <span class="text-sm text-slate-800">${escapeHtml(a.nome)}</span>
              <button type="button" data-action="elimina-alimento" data-alimento-id="${a.id}"
                class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition" title="Elimina">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
}

/* ── Cosa mi manca ── */

export function renderListaMancanti() {
  const stato = state.getStatoMancanti();

  els.listaMancanti.innerHTML = stato.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-200/80">Nessun alimento da valutare — genera dal piano corrente.</p>`
    : stato.map((s) => `
        <div class="p-2.5 flex items-center justify-between gap-2 bg-white first:rounded-t-xl last:rounded-b-xl border-x border-slate-200/80 first:border-t last:border-b">
          <span class="text-sm text-slate-800 min-w-0 truncate">${escapeHtml(s.nome)}</span>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" data-action="mancante-manca" data-stato-id="${s.id}" data-nome="${escapeHtml(s.nome)}"
              class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition">
              Manca
            </button>
            <button type="button" data-action="mancante-ce-lho" data-stato-id="${s.id}"
              class="border border-slate-300 text-slate-600 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition">
              Ce l'ho
            </button>
          </div>
        </div>
      `).join("");
}

/* ── Impostazioni: categorie ── */

export function renderListaCategorieImpostazioni() {
  const categorie = state.getCategorie();
  els.listaCategorieImpostazioni.innerHTML = categorie.length === 0
    ? `<p class="text-xs text-slate-400">Nessuna categoria ancora.</p>`
    : categorie.map((c) => `
        <span class="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 pl-3 pr-1.5 py-1.5 rounded-full font-medium">
          ${escapeHtml(c.nome)}
          <button type="button" data-action="elimina-categoria" data-categoria-id="${c.id}" data-nome="${escapeHtml(c.nome)}"
            class="text-slate-400 hover:text-red-500 w-4 h-4 flex items-center justify-center">
            <i class="fa-solid fa-xmark text-[10px]"></i>
          </button>
        </span>
      `).join("");
}

/* ── Template: elenco (nella sua sotto-vista dedicata) ── */

export function renderListaTemplate() {
  const templates = state.getTemplates();
  els.listaTemplate.innerHTML = templates.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-200/80">Nessun template ancora.</p>`
    : templates.map((t) => `
        <div class="bg-white px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl">
          <div class="min-w-0">
            <span class="block text-sm font-semibold text-slate-800 truncate">${escapeHtml(t.nome)}</span>
            ${!t.casa_id ? `<span class="text-[11px] text-slate-400">Template di sistema</span>` : ""}
          </div>
          ${t.casa_id ? `
            <button type="button" data-action="elimina-template" data-template-id="${t.id}" data-nome="${escapeHtml(t.nome)}"
              class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition flex-shrink-0">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          ` : ""}
        </div>
      `).join("");
}

/* ── Modal: compila da template (un solo passaggio: scegli + nomina) ── */

export function renderSelectTemplates() {
  const templates = state.getTemplates();
  els.selectTemplateDaUsare.innerHTML = templates.length === 0
    ? `<option value="">Nessun template disponibile</option>`
    : templates.map((t) => `<option value="${t.id}">${escapeHtml(t.nome)}${t.casa_id ? "" : " (di sistema)"}</option>`).join("");
}

export function apriModalCompilaTemplate() {
  els.inputNomeNuovoPianoDaTemplate.value = "";
  els.modalCompilaTemplate.classList.remove("hidden");
}

export function chiudiModalCompilaTemplate() {
  els.modalCompilaTemplate.classList.add("hidden");
}

/* ── Modal: compila da settimana precedente ── */

export function renderSelectPianoOrigine() {
  const piani = state.getPiani();
  els.selectPianoOrigine.innerHTML = piani.length === 0
    ? `<option value="">Nessun piano precedente</option>`
    : piani.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join("");
}

export function apriModalCompilaPrecedente() {
  els.inputNomeNuovoPianoDaPrecedente.value = "";
  els.modalCompilaPrecedente.classList.remove("hidden");
}

export function chiudiModalCompilaPrecedente() {
  els.modalCompilaPrecedente.classList.add("hidden");
}

/* ── Modal: nuovo template (costruttore) ── */

export function apriModalNuovoTemplate() {
  els.inputNomeNuovoTemplate.value = "";
  els.nuovoTemplateStep1.classList.remove("hidden");
  els.nuovoTemplateGriglia.classList.add("hidden");
  els.nuovoTemplateGriglia.innerHTML = "";
  els.btnFineNuovoTemplate.classList.add("hidden");
  els.modalNuovoTemplate.classList.remove("hidden");
}

export function chiudiModalNuovoTemplate() {
  els.modalNuovoTemplate.classList.add("hidden");
}

export function mostraGrigliaNuovoTemplate() {
  els.nuovoTemplateStep1.classList.add("hidden");
  els.nuovoTemplateGriglia.classList.remove("hidden");
  els.btnFineNuovoTemplate.classList.remove("hidden");
}

function renderRigaPastoTemplateBuilder(pasto) {
  const categorie = pasto.template_pasto_categorie ?? [];
  return `
    <div class="p-2 sm:p-2.5">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">${escapeHtml(pasto.tipi_pasto?.nome ?? "")}</span>
        <div class="flex items-center gap-1">
          <button type="button" data-action="template-apri-scegli-categoria" data-pasto-id="${pasto.id}"
            class="text-indigo-600 hover:bg-indigo-50 w-5 h-5 rounded-full flex items-center justify-center transition" title="Aggiungi categoria">
            <i class="fa-solid fa-plus text-[10px]"></i>
          </button>
          <button type="button" data-action="template-rimuovi-pasto" data-pasto-id="${pasto.id}"
            class="text-slate-300 hover:text-red-500 w-5 h-5 rounded-full flex items-center justify-center transition" title="Rimuovi pasto">
            <i class="fa-solid fa-trash-can text-[10px]"></i>
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1">
        ${categorie.length === 0
          ? `<span class="text-xs text-slate-400 italic">Nessuna categoria</span>`
          : categorie.map((c) => `
            <span class="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 pl-2 pr-1 py-0.5 rounded-lg font-medium">
              ${escapeHtml(c.categorie_alimento?.nome ?? "")}
              <button type="button" data-action="template-rimuovi-categoria" data-riga-id="${c.id}"
                class="text-slate-400 hover:text-red-500 w-3.5 h-3.5 flex items-center justify-center">
                <i class="fa-solid fa-xmark text-[9px]"></i>
              </button>
            </span>
          `).join("")}
      </div>
    </div>
  `;
}

function renderGiornoTemplateBuilder(giorno) {
  const pastiEsistentiTipoIds = new Set((giorno.template_pasti ?? []).map((p) => p.tipo_pasto_id));
  const tipiDisponibili = state.getTipiPasto().filter((t) => !pastiEsistentiTipoIds.has(t.id));

  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div class="bg-slate-50/80 px-3 py-1.5 border-b border-slate-100 font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center justify-between gap-2">
        <span>${GIORNI_SETTIMANA[giorno.giorno_settimana]}</span>
        ${tipiDisponibili.length ? `
          <select data-action="template-aggiungi-pasto" data-giorno-id="${giorno.id}"
            class="text-[11px] border border-slate-300 rounded-lg px-1.5 py-0.5 font-semibold normal-case text-indigo-700 bg-white">
            <option value="">+ pasto</option>
            ${tipiDisponibili.map((t) => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join("")}
          </select>
        ` : ""}
      </div>
      <div class="divide-y divide-slate-100">
        ${(giorno.template_pasti ?? []).length
          ? giorno.template_pasti.map(renderRigaPastoTemplateBuilder).join("")
          : `<p class="text-xs text-slate-400 italic px-3 py-2">Nessun pasto</p>`}
      </div>
    </div>
  `;
}

export function renderGrigliaNuovoTemplate() {
  const struttura = state.getStrutturaTemplateInCostruzione();
  els.nuovoTemplateGriglia.innerHTML = struttura.map(renderGiornoTemplateBuilder).join("");
}

/* ── Modal: scegli categoria per un pasto del template ── */

export function apriSceltaCategoriaTemplate(pastoId, categorieGiaPresenti) {
  const giaPresentiIds = new Set(categorieGiaPresenti);
  const disponibili = state.getCategorie().filter((c) => !giaPresentiIds.has(c.id));

  els.listaScegliCategoriaTemplate.innerHTML = disponibili.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-4">Tutte le categorie sono già assegnate a questo pasto.</p>`
    : disponibili.map((c) => `
        <button type="button" data-action="template-scegli-categoria" data-pasto-id="${pastoId}" data-categoria-id="${c.id}"
          class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-700 transition">
          ${escapeHtml(c.nome)}
        </button>
      `).join("");

  els.modalScegliCategoriaTemplate.classList.remove("hidden");
}

export function chiudiSceltaCategoriaTemplate() {
  els.modalScegliCategoriaTemplate.classList.add("hidden");
}
