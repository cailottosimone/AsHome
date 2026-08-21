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

  nomePianoCorrente: document.getElementById("nomePianoCorrente"),
  menuPiano: document.getElementById("menuPiano"),
  listaPianiMenu: document.getElementById("listaPianiMenu"),
  menuNuovoPiano: document.getElementById("menuNuovoPiano"),
  grigliaGiorniPasti: document.getElementById("grigliaGiorniPasti"),
  pianoVuotoState: document.getElementById("pianoVuotoState"),

  formNuovoAlimento: document.getElementById("formNuovoAlimento"),
  formNuovoAlimentoTitolo: document.getElementById("formNuovoAlimentoTitolo"),
  inputNomeAlimento: document.getElementById("inputNomeAlimento"),
  chipCategorieNuovoAlimento: document.getElementById("chipCategorieNuovoAlimento"),
  btnSalvaAlimento: document.getElementById("btnSalvaAlimento"),
  btnAnnullaModificaAlimento: document.getElementById("btnAnnullaModificaAlimento"),
  listaAlimenti: document.getElementById("listaAlimenti"),

  listaMancanti: document.getElementById("listaMancanti"),
  btnInviaAllaLista: document.getElementById("btnInviaAllaLista"),

  listaCategorieImpostazioni: document.getElementById("listaCategorieImpostazioni"),
  listaTemplate: document.getElementById("listaTemplate"),

  modalCompilaPasto: document.getElementById("modalCompilaPasto"),
  modalCompilaPastoTitolo: document.getElementById("modalCompilaPastoTitolo"),
  filtroCompilaPasto: document.getElementById("filtroCompilaPasto"),
  modalCompilaPastoContenuto: document.getElementById("modalCompilaPastoContenuto"),

  modalCompilaTemplate: document.getElementById("modalCompilaTemplate"),
  selectTemplateDaUsare: document.getElementById("selectTemplateDaUsare"),
  inputNomeNuovoPianoDaTemplate: document.getElementById("inputNomeNuovoPianoDaTemplate"),

  modalCompilaPrecedente: document.getElementById("modalCompilaPrecedente"),
  selectPianoOrigine: document.getElementById("selectPianoOrigine"),
  inputNomeNuovoPianoDaPrecedente: document.getElementById("inputNomeNuovoPianoDaPrecedente"),

  modalNuovoTemplate: document.getElementById("modalNuovoTemplate"),
  modalNuovoTemplateTitolo: document.getElementById("modalNuovoTemplateTitolo"),
  inputNomeNuovoTemplate: document.getElementById("inputNomeNuovoTemplate"),
  btnCreaTemplate: document.getElementById("btnCreaTemplate"),
  nuovoTemplateGriglia: document.getElementById("nuovoTemplateGriglia"),

  modalScegliCategoriaTemplate: document.getElementById("modalScegliCategoriaTemplate"),
  listaScegliCategoriaTemplate: document.getElementById("listaScegliCategoriaTemplate"),
  btnConfermaSceltaCategorieTemplate: document.getElementById("btnConfermaSceltaCategorieTemplate"),
};

const escapeHtml = (str = "") =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

/* ── Navigazione interna (sotto-viste) ── */

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

/* ── Menu piano: solo lo switch tra piani esistenti ── */

export function renderMenuPiano() {
  const piani = state.getPiani();
  const correnteId = state.getPianoCorrenteId();
  const corrente = piani.find((p) => p.id === correnteId);

  els.nomePianoCorrente.textContent = corrente ? corrente.nome : (piani.length ? "Scegli un piano" : "Nessun piano");

  els.listaPianiMenu.innerHTML = piani.length === 0
    ? `<p class="text-sm text-slate-400 px-3 py-2">Nessun piano ancora.</p>`
    : piani.map((p) => `
        <button type="button" data-action="seleziona-piano" data-piano-id="${p.id}"
          class="w-full text-left px-3 py-2.5 rounded-lg transition text-sm flex items-center gap-2 ${
            p.id === correnteId ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
          }">
          <i class="fa-solid fa-check text-xs ${p.id === correnteId ? "" : "invisible"}"></i>
          <span class="truncate">${escapeHtml(p.nome)}</span>
        </button>
      `).join("");
}

export function toggleMenuPiano() {
  els.menuPiano.classList.toggle("hidden");
}

export function chiudiMenuPiano() {
  els.menuPiano.classList.add("hidden");
}

/* ── Menu "Nuovo piano": le tre modalità di creazione, controllo separato dallo switch ── */

export function toggleMenuNuovoPiano() {
  els.menuNuovoPiano.classList.toggle("hidden");
}

export function chiudiMenuNuovoPiano() {
  els.menuNuovoPiano.classList.add("hidden");
}

/* ── Griglia giorni: card compatte Pranzo/Cena affiancate ── */

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
      <div class="bg-slate-50/80 px-3 py-1.5 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">
        ${GIORNI_SETTIMANA[giorno.giorno_settimana]}
      </div>
      <div class="grid grid-cols-2 divide-x divide-slate-100">
        ${(giorno.piano_pasti ?? [])
          .slice()
          .sort((a, b) => (a.tipi_pasto?.ordine ?? 0) - (b.tipi_pasto?.ordine ?? 0))
          .map(renderCardPasto)
          .join("")}
      </div>
    </div>
  `).join("");

  // Se il form di compilazione di un pasto è aperto, lo riallinea allo
  // stato fresco appena caricato (utile anche se arriva un aggiornamento
  // realtime da un altro dispositivo mentre il form è aperto).
  renderModalCompilaPasto();
}

function renderCardPasto(pasto) {
  const nomeTipo = pasto.tipi_pasto?.nome ?? "";
  const sezioni = pasto.piano_pasto_categorie ?? [];
  const alimenti = pasto.piano_pasto_alimenti ?? [];

  let righe;
  if (alimenti.length === 0 && sezioni.length === 0) {
    righe = `<span class="text-sm text-slate-300 italic">Vuoto</span>`;
  } else if (sezioni.length === 0) {
    righe = alimenti.map((a) => `<div class="text-sm text-slate-700 truncate">${escapeHtml(a.alimenti?.nome ?? "")}</div>`).join("");
  } else {
    // Una sezione compilata mostra solo i nomi (la categoria si intuisce
    // da cosa contiene); una sezione ancora vuota mostra il nome della
    // categoria stessa, come promemoria di cosa manca pianificare.
    righe = sezioni.map((sez) => {
      const nomi = alimenti.filter((a) => a.categoria_id === sez.categoria_id).map((a) => a.alimenti?.nome ?? "");
      return nomi.length
        ? `<div class="text-sm text-slate-700 truncate">${nomi.map(escapeHtml).join(", ")}</div>`
        : `<div class="text-sm text-slate-300 italic truncate">${escapeHtml(sez.categorie_alimento?.nome ?? "")}</div>`;
    }).join("");
  }

  return `
    <button type="button" data-action="apri-compila-pasto" data-pasto-id="${pasto.id}"
      class="p-3 text-left hover:bg-indigo-50/60 transition flex flex-col gap-1 min-h-[72px]">
      <span class="text-xs font-bold text-indigo-700 uppercase tracking-wide">${escapeHtml(nomeTipo)}</span>
      ${righe}
    </button>
  `;
}

/* ── Form unico per compilare un intero pasto: tutte le sue categorie insieme ── */

let pastoInCompilazione = null;

function trovaPastoInCompilazione() {
  if (!pastoInCompilazione) return null;
  for (const giorno of state.getStrutturaPianoCorrente()) {
    const pasto = (giorno.piano_pasti ?? []).find((p) => p.id === pastoInCompilazione);
    if (pasto) return { pasto, giorno };
  }
  return null;
}

let filtroCompilaPasto = "";

function renderSezioneCompilaPasto(pastoId, categoriaId, nomeSezione, alimentiSezione, sottotitolo) {
  const compatibili = categoriaId
    ? state.getAlimenti().filter((a) => a.categorie.some((c) => c.id === categoriaId))
    : state.getAlimenti();
  const idsPresenti = new Set(alimentiSezione.map((a) => a.alimento_id));
  const testoFiltro = filtroCompilaPasto.trim().toLowerCase();
  const disponibili = compatibili
    .filter((a) => !idsPresenti.has(a.id))
    .filter((a) => !testoFiltro || a.nome.toLowerCase().includes(testoFiltro));

  return `
    <div class="space-y-2">
      <div>
        <p class="text-sm font-bold text-slate-500 uppercase tracking-wider">${escapeHtml(nomeSezione)}</p>
        ${sottotitolo ? `<p class="text-xs text-slate-400">${escapeHtml(sottotitolo)}</p>` : ""}
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${alimentiSezione.length === 0
          ? `<span class="text-sm text-slate-400 italic">Nessun alimento</span>`
          : alimentiSezione.map((a) => `
            <span class="inline-flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 pl-2.5 pr-1.5 py-1.5 rounded-lg font-medium">
              ${escapeHtml(a.alimenti?.nome ?? "")}
              <button type="button" data-action="rimuovi-alimento-da-pasto" data-riga-id="${a.id}"
                class="text-indigo-400 hover:text-red-500 w-4 h-4 flex items-center justify-center">
                <i class="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </span>
          `).join("")}
      </div>
      ${disponibili.length ? `
        <div class="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-36 overflow-y-auto">
          ${disponibili.map((a) => `
            <button type="button" data-action="aggiungi-in-compila-pasto" data-pasto-id="${pastoId}" data-alimento-id="${a.id}" ${categoriaId ? `data-categoria-id="${categoriaId}"` : ""}
              class="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-2">
              <i class="fa-solid fa-plus text-[10px]"></i> ${escapeHtml(a.nome)}
            </button>
          `).join("")}
        </div>
      ` : `<p class="text-sm text-slate-300 italic">${testoFiltro ? "Nessun risultato per la ricerca" : "Nessun altro alimento disponibile in dispensa"}</p>`}
    </div>
  `;
}

export function renderModalCompilaPasto() {
  const trovato = trovaPastoInCompilazione();
  if (!trovato) return;
  const { pasto, giorno } = trovato;

  els.modalCompilaPastoTitolo.textContent = `${GIORNI_SETTIMANA[giorno.giorno_settimana]} · ${pasto.tipi_pasto?.nome ?? ""}`;

  const sezioni = pasto.piano_pasto_categorie ?? [];
  const alimenti = pasto.piano_pasto_alimenti ?? [];

  if (sezioni.length === 0) {
    els.modalCompilaPastoContenuto.innerHTML = renderSezioneCompilaPasto(pasto.id, null, "Alimenti", alimenti);
    return;
  }

  // Il piano da template non è vincolante: oltre alle categorie attese,
  // c'è SEMPRE una sezione libera per aggiungere qualcos'altro — azione
  // esplicita e distinta, non nascosta né mescolata alle categorie previste.
  const alimentiSenzaSezione = alimenti.filter((a) => !sezioni.some((s) => s.categoria_id === a.categoria_id));
  els.modalCompilaPastoContenuto.innerHTML =
    sezioni.map((sez) => renderSezioneCompilaPasto(
      pasto.id, sez.categoria_id, sez.categorie_alimento?.nome ?? "", alimenti.filter((a) => a.categoria_id === sez.categoria_id)
    )).join("")
    + renderSezioneCompilaPasto(pasto.id, null, "Altro", alimentiSenzaSezione, "Qualcosa fuori dalle categorie previste dal template");
}

export function filtraCompilaPasto(testo) {
  filtroCompilaPasto = testo;
  renderModalCompilaPasto();
}

export function apriCompilaPasto(pastoId) {
  pastoInCompilazione = pastoId;
  filtroCompilaPasto = "";
  if (els.filtroCompilaPasto) els.filtroCompilaPasto.value = "";
  renderModalCompilaPasto();
  els.modalCompilaPasto.classList.remove("hidden");
}

export function chiudiCompilaPasto() {
  pastoInCompilazione = null;
  els.modalCompilaPasto.classList.add("hidden");
}

/* ── Chip di selezione categorie (form dispensa) ── */

export function renderChipCategorieNuovoAlimento(categoriaIdsSelezionate = []) {
  const selezionate = new Set(categoriaIdsSelezionate);
  const categorie = state.getCategorie();
  els.chipCategorieNuovoAlimento.innerHTML = categorie.map((c) => {
    const attiva = selezionate.has(c.id);
    return `
      <button type="button" data-action="toggle-categoria-chip" data-categoria-id="${c.id}" data-selected="${attiva}"
        class="chip-categoria px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
          attiva ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"
        }">
        ${escapeHtml(c.nome)}
      </button>
    `;
  }).join("");
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

/* ── Dispensa: lista raggruppata per categoria, con modifica ── */

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
        <div class="bg-slate-50/80 px-3 py-1.5 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">
          ${escapeHtml(nomeCategoria)}
        </div>
        <div class="divide-y divide-slate-100">
          ${elenco.map((a) => `
            <div class="px-3 py-2 flex items-center justify-between gap-2">
              <span class="text-sm text-slate-800">${escapeHtml(a.nome)}</span>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button type="button" data-action="modifica-alimento" data-alimento-id="${a.id}"
                  class="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition" title="Modifica">
                  <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button type="button" data-action="elimina-alimento" data-alimento-id="${a.id}"
                  class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition" title="Elimina">
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
}

export function apriModificaAlimento(alimento) {
  els.formNuovoAlimentoTitolo.textContent = "Modifica alimento";
  els.inputNomeAlimento.value = alimento.nome;
  renderChipCategorieNuovoAlimento(alimento.categorie.map((c) => c.id));
  els.btnSalvaAlimento.textContent = "Salva modifiche";
  els.btnAnnullaModificaAlimento.classList.remove("hidden");
  els.inputNomeAlimento.focus();
}

export function resetFormAlimento() {
  els.formNuovoAlimentoTitolo.textContent = "Aggiungi alla dispensa";
  els.formNuovoAlimento.reset();
  renderChipCategorieNuovoAlimento();
  els.btnSalvaAlimento.textContent = "Aggiungi";
  els.btnAnnullaModificaAlimento.classList.add("hidden");
}

/* ── Cosa mi manca ── */

export function renderListaMancanti() {
  const stato = state.getStatoMancanti();
  const decisioni = state.getDecisioniMancanti();

  els.listaMancanti.innerHTML = stato.length === 0
    ? `<p class="text-sm text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-200/80">Nessun alimento da valutare — genera dal piano corrente.</p>`
    : stato.map((s) => {
        const decisione = decisioni.get(s.id);
        return `
          <div class="p-3 flex items-center justify-between gap-2 bg-white first:rounded-t-xl last:rounded-b-xl border-x border-slate-200/80 first:border-t last:border-b">
            <span class="text-sm text-slate-800 min-w-0 truncate">${escapeHtml(s.nome)}</span>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" data-action="segna-decisione-mancante" data-stato-id="${s.id}" data-decisione="manca"
                class="text-sm font-bold px-3 py-1.5 rounded-lg transition ${
                  decisione === "manca" ? "bg-amber-500 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }">
                Manca
              </button>
              <button type="button" data-action="segna-decisione-mancante" data-stato-id="${s.id}" data-decisione="ce_lho"
                class="text-sm font-bold px-3 py-1.5 rounded-lg transition ${
                  decisione === "ce_lho" ? "bg-slate-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }">
                Ce l'ho
              </button>
            </div>
          </div>
        `;
      }).join("");

  const numeroManca = Array.from(decisioni.values()).filter((d) => d === "manca").length;
  els.btnInviaAllaLista.classList.toggle("hidden", stato.length === 0);
  els.btnInviaAllaLista.disabled = numeroManca === 0;
  els.btnInviaAllaLista.textContent = numeroManca > 0 ? `Invia alla lista (${numeroManca})` : "Invia alla lista";
}

/* ── Impostazioni: categorie, in elenco tabellare ── */

export function renderListaCategorieImpostazioni() {
  const categorie = state.getCategorie();
  els.listaCategorieImpostazioni.innerHTML = categorie.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-4">Nessuna categoria ancora.</p>`
    : categorie.map((c) => `
        <div class="px-3.5 py-2 flex items-center justify-between gap-2 bg-white">
          <span class="text-sm text-slate-800">${escapeHtml(c.nome)}</span>
          <button type="button" data-action="elimina-categoria" data-categoria-id="${c.id}" data-nome="${escapeHtml(c.nome)}"
            class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      `).join("");
}

/* ── Template: elenco (nella sua sotto-vista dedicata) ── */

export function renderListaTemplate() {
  const templates = state.getTemplates();
  els.listaTemplate.innerHTML = templates.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-200/80">Nessun template ancora.</p>`
    : templates.map((t) => `
        <div class="bg-white px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl ${t.casa_id ? "cursor-pointer hover:bg-slate-50" : ""} transition"
          ${t.casa_id ? `data-action="modifica-template" data-template-id="${t.id}"` : ""}>
          <div class="min-w-0">
            <span class="block text-sm font-semibold text-slate-800 truncate">${escapeHtml(t.nome)}</span>
            <span class="text-xs text-slate-400">${t.casa_id ? "Tocca per modificare" : "Template di sistema"}</span>
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

/* ── Modal: compila da template (un solo passo: scegli + nomina) ── */

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

/* ── Modal: nuovo template / modifica template ── */

export function apriModalTemplateNuovo() {
  els.modalNuovoTemplateTitolo.textContent = "Nuovo template";
  els.inputNomeNuovoTemplate.value = "";
  els.inputNomeNuovoTemplate.disabled = false;
  els.btnCreaTemplate.classList.remove("hidden");
  els.nuovoTemplateGriglia.classList.add("hidden");
  els.nuovoTemplateGriglia.innerHTML = "";
  els.modalNuovoTemplate.classList.remove("hidden");
}

export function apriModalTemplateEsistente(nome) {
  els.modalNuovoTemplateTitolo.textContent = "Modifica template";
  els.inputNomeNuovoTemplate.value = nome;
  els.inputNomeNuovoTemplate.disabled = false;
  els.btnCreaTemplate.classList.add("hidden");
  els.nuovoTemplateGriglia.classList.remove("hidden");
  els.modalNuovoTemplate.classList.remove("hidden");
}

export function chiudiModalNuovoTemplate() {
  els.modalNuovoTemplate.classList.add("hidden");
}

export function mostraGrigliaNuovoTemplate() {
  els.btnCreaTemplate.classList.add("hidden");
  els.nuovoTemplateGriglia.classList.remove("hidden");
}

function renderRigaPastoTemplateBuilder(pasto) {
  const categorie = pasto.template_pasto_categorie ?? [];
  return `
    <div class="p-2 sm:p-2.5">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">${escapeHtml(pasto.tipi_pasto?.nome ?? "")}</span>
        <button type="button" data-action="template-apri-scegli-categoria" data-pasto-id="${pasto.id}"
          class="text-indigo-600 hover:bg-indigo-50 w-5 h-5 rounded-full flex items-center justify-center transition" title="Aggiungi categoria">
          <i class="fa-solid fa-plus text-[10px]"></i>
        </button>
      </div>
      <div class="flex flex-wrap gap-1">
        ${categorie.length === 0
          ? `<span class="text-xs text-slate-400 italic">Non pianificato</span>`
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
  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div class="bg-slate-50/80 px-3 py-1.5 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">
        ${GIORNI_SETTIMANA[giorno.giorno_settimana]}
      </div>
      <div class="divide-y divide-slate-100">
        ${(giorno.template_pasti ?? [])
          .slice()
          .sort((a, b) => (a.tipi_pasto?.ordine ?? 0) - (b.tipi_pasto?.ordine ?? 0))
          .map(renderRigaPastoTemplateBuilder).join("")}
      </div>
    </div>
  `;
}

export function renderGrigliaNuovoTemplate() {
  const struttura = state.getStrutturaTemplateInCostruzione();
  els.nuovoTemplateGriglia.innerHTML = struttura.map(renderGiornoTemplateBuilder).join("");
}

/* ── Modal: scegli categorie per un pasto del template — multi-selezione ── */

let sceltaCategorieTemplate = { pastoId: null, disponibili: [], selezionate: new Set() };

function renderListaSceltaCategorieTemplate() {
  const { disponibili, selezionate } = sceltaCategorieTemplate;

  els.listaScegliCategoriaTemplate.innerHTML = disponibili.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-4">Tutte le categorie sono già assegnate a questo pasto.</p>`
    : disponibili.map((c) => {
        const selezionata = selezionate.has(c.id);
        return `
          <button type="button" data-action="toggle-scegli-categoria-template" data-categoria-id="${c.id}"
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
              selezionata ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700"
            }">
            <i class="fa-regular ${selezionata ? "fa-square-check text-indigo-600" : "fa-square text-slate-300"}"></i>
            ${escapeHtml(c.nome)}
          </button>
        `;
      }).join("");

  els.btnConfermaSceltaCategorieTemplate.textContent = selezionate.size > 0 ? `Aggiungi (${selezionate.size})` : "Aggiungi";
  els.btnConfermaSceltaCategorieTemplate.disabled = selezionate.size === 0;
}

export function apriSceltaCategoriaTemplate(pastoId, categorieGiaPresenti) {
  const giaPresentiIds = new Set(categorieGiaPresenti);
  sceltaCategorieTemplate = {
    pastoId,
    disponibili: state.getCategorie().filter((c) => !giaPresentiIds.has(c.id)),
    selezionate: new Set(),
  };
  renderListaSceltaCategorieTemplate();
  els.modalScegliCategoriaTemplate.classList.remove("hidden");
}

export function toggleSceltaCategoriaTemplate(categoriaId) {
  const { selezionate } = sceltaCategorieTemplate;
  if (selezionate.has(categoriaId)) selezionate.delete(categoriaId);
  else selezionate.add(categoriaId);
  renderListaSceltaCategorieTemplate();
}

export function chiudiSceltaCategoriaTemplate() {
  els.modalScegliCategoriaTemplate.classList.add("hidden");
}

/** Ritorna { pastoId, categoriaIds } e chiude il modale. Da chiamare al "Conferma". */
export function leggiEChiudiSceltaCategorieTemplate() {
  const risultato = {
    pastoId: sceltaCategorieTemplate.pastoId,
    categoriaIds: Array.from(sceltaCategorieTemplate.selezionate),
  };
  chiudiSceltaCategoriaTemplate();
  return risultato;
}
