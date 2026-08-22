// js/mealplan-ui.js
// Tutto il rendering DOM del Piano Alimentare. Nessuna chiamata di rete:
// riceve dati già pronti da mealplan-app.js, come ui.js fa per la lista spesa.
//
// La visibilità dell'intera sotto-app (Piano Alimentare vs Lista Spesa)
// è gestita da main.js, non da qui: questo modulo si occupa solo di
// cosa succede DENTRO il Piano Alimentare (le sue sotto-viste interne).

import { GIORNI_SETTIMANA } from "./config.js";
import { formattaRangeSettimana, etichettaGiorno, partiGiorno } from "./date-utils.js";
import * as state from "./mealplan-state.js";

export const els = {
  tabButtons: document.querySelectorAll('[data-action="sotto-vista"]'),

  sottoVistaPiano: document.getElementById("sottoVistaPiano"),
  sottoVistaDispensa: document.getElementById("sottoVistaDispensa"),
  sottoVistaTemplate: document.getElementById("sottoVistaTemplate"),

  rangeSettimanaCorrente: document.getElementById("rangeSettimanaCorrente"),
  btnCosaMiManca: document.getElementById("btnCosaMiManca"),
  contaMancanti: document.getElementById("contaMancanti"),
  menuCompilaSettimana: document.getElementById("menuCompilaSettimana"),
  btnCompilaDaPrecedente: document.getElementById("btnCompilaDaPrecedente"),
  riepilogoCategorie: document.getElementById("riepilogoCategorie"),
  grigliaGiorniPasti: document.getElementById("grigliaGiorniPasti"),

  formNuovoAlimento: document.getElementById("formNuovoAlimento"),
  formNuovoAlimentoTitolo: document.getElementById("formNuovoAlimentoTitolo"),
  inputNomeAlimento: document.getElementById("inputNomeAlimento"),
  btnScegliCategorieAlimento: document.getElementById("btnScegliCategorieAlimento"),
  labelCategorieAlimento: document.getElementById("labelCategorieAlimento"),
  modalScegliCategorieAlimento: document.getElementById("modalScegliCategorieAlimento"),
  listaScegliCategorieAlimento: document.getElementById("listaScegliCategorieAlimento"),
  btnSalvaAlimento: document.getElementById("btnSalvaAlimento"),
  btnAnnullaModificaAlimento: document.getElementById("btnAnnullaModificaAlimento"),
  listaAlimenti: document.getElementById("listaAlimenti"),

  modalCosaMiManca: document.getElementById("modalCosaMiManca"),
  listaMancanti: document.getElementById("listaMancanti"),
  btnInviaAllaLista: document.getElementById("btnInviaAllaLista"),

  listaTemplate: document.getElementById("listaTemplate"),

  modalCompilaPasto: document.getElementById("modalCompilaPasto"),
  modalCompilaPastoTitolo: document.getElementById("modalCompilaPastoTitolo"),
  filtroCompilaPasto: document.getElementById("filtroCompilaPasto"),
  btnFiltroCategoriaCompilaPasto: document.getElementById("btnFiltroCategoriaCompilaPasto"),
  menuFiltroCategoriaCompilaPasto: document.getElementById("menuFiltroCategoriaCompilaPasto"),
  modalCompilaPastoContenuto: document.getElementById("modalCompilaPastoContenuto"),

  modalCompilaTemplate: document.getElementById("modalCompilaTemplate"),
  selectTemplateDaUsare: document.getElementById("selectTemplateDaUsare"),

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

  els.tabButtons.forEach((btn) => {
    const attiva = btn.dataset.vista === vista;
    btn.classList.toggle("text-indigo-600", attiva);
    btn.classList.toggle("border-indigo-600", attiva);
    btn.classList.toggle("text-slate-400", !attiva);
    btn.classList.toggle("border-transparent", !attiva);
  });
}

/* ── Navigatore settimana: range di date + azioni, niente più elenco di piani nominati ── */

export function renderNavigatoreSettimana() {
  const dataInizio = state.getSettimanaCorrente();
  els.rangeSettimanaCorrente.textContent = dataInizio ? formattaRangeSettimana(dataInizio) : "";

  const precedente = state.getSettimanaPrecedentePopolata();
  els.btnCompilaDaPrecedente.disabled = !precedente;
}

/* ── Riepilogo categorie: quante volte è usata ogni categoria questa settimana ── */

export function renderRiepilogoCategorie() {
  const struttura = state.getStrutturaPianoCorrente();
  const conteggio = new Map(); // nome categoria -> quante volte

  for (const giorno of struttura) {
    for (const pasto of giorno.piano_pasti ?? []) {
      for (const riga of pasto.piano_pasto_alimenti ?? []) {
        const alimento = state.findAlimento(riga.alimento_id);
        const categorie = alimento?.categorie ?? [];
        if (categorie.length === 0) {
          conteggio.set("Senza categoria", (conteggio.get("Senza categoria") ?? 0) + 1);
        } else {
          for (const c of categorie) conteggio.set(c.nome, (conteggio.get(c.nome) ?? 0) + 1);
        }
      }
    }
  }

  const righe = Array.from(conteggio.entries()).sort((a, b) => b[1] - a[1]);
  els.riepilogoCategorie.innerHTML = righe.length === 0
    ? `<p class="text-sm text-slate-400">Nessun alimento pianificato ancora questa settimana.</p>`
    : righe.map(([nome, volte]) => `
        <div class="flex items-center justify-between gap-2 py-1.5">
          <span class="text-sm text-slate-700">${escapeHtml(nome)}</span>
          <span class="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg flex-shrink-0">${volte} ${volte === 1 ? "volta" : "volte"}</span>
        </div>
      `).join("");
}

/* ── Griglia giorni: card compatte Pranzo/Cena affiancate ── */

export function renderGrigliaPiano() {
  const struttura = state.getStrutturaPianoCorrente();
  const tipiPasto = state.getTipiPasto();
  const dataInizio = state.getSettimanaCorrente();

  // Una settimana mai toccata non ha ancora righe in DB: la mostro
  // comunque, con pasti "virtuali" (senza id) — diventano reali alla
  // prima interazione (vedi apri-compila-pasto in mealplan-app.js).
  const giorni = struttura.length > 0
    ? struttura
    : Array.from({ length: 7 }, (_, g) => ({
        giorno_settimana: g,
        piano_pasti: tipiPasto.map((t) => ({
          id: null,
          tipo_pasto_id: t.id,
          tipi_pasto: { nome: t.nome, ordine: t.ordine },
          piano_pasto_categorie: [],
          piano_pasto_alimenti: [],
        })),
      }));

  els.grigliaGiorniPasti.innerHTML = giorni.map((giorno) => {
    const { nomeBreve, numero } = dataInizio
      ? partiGiorno(dataInizio, giorno.giorno_settimana)
      : { nomeBreve: GIORNI_SETTIMANA[giorno.giorno_settimana].slice(0, 3).toUpperCase(), numero: "" };

    return `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden flex">
        <div class="flex-shrink-0 w-14 sm:w-16 bg-slate-50/80 border-r border-slate-100 flex flex-col items-center justify-center py-2">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">${escapeHtml(nomeBreve)}</span>
          <span class="text-xl sm:text-2xl font-extrabold text-slate-700 leading-none mt-0.5">${numero}</span>
        </div>
        <div class="flex-1 min-w-0 grid grid-cols-2 divide-x divide-slate-100">
          ${(giorno.piano_pasti ?? [])
            .slice()
            .sort((a, b) => (a.tipi_pasto?.ordine ?? 0) - (b.tipi_pasto?.ordine ?? 0))
            .map((pasto) => renderCardPasto(giorno.giorno_settimana, pasto))
            .join("")}
        </div>
      </div>
    `;
  }).join("");

  renderRiepilogoCategorie();

  // Se il form di compilazione di un pasto è aperto, lo riallinea allo
  // stato fresco appena caricato (utile anche se arriva un aggiornamento
  // realtime da un altro dispositivo mentre il form è aperto).
  renderModalCompilaPasto();
}

function renderCardPasto(giornoSettimana, pasto) {
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
    <button type="button" data-action="apri-compila-pasto" ${pasto.id ? `data-pasto-id="${pasto.id}"` : ""}
      data-giorno-settimana="${giornoSettimana}" data-tipo-pasto-id="${pasto.tipo_pasto_id}"
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
let categorieFiltroCompilaPasto = new Set(); // filtro per categoria, si applica solo alle sezioni "libere" (categoriaId null)

function renderSezioneCompilaPasto(pastoId, categoriaId, nomeSezione, alimentiSezione, sottotitolo) {
  let compatibili = categoriaId
    ? state.getAlimenti().filter((a) => a.categorie.some((c) => c.id === categoriaId))
    : state.getAlimenti();

  // Il filtro per categoria (icona a fianco della ricerca) si applica
  // solo dove non c'è già una categoria imposta dal template — lì
  // sarebbe ridondante, è già filtrato a una sola categoria.
  if (!categoriaId && categorieFiltroCompilaPasto.size > 0) {
    compatibili = compatibili.filter((a) => a.categorie.some((c) => categorieFiltroCompilaPasto.has(c.id)));
  }

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
      ` : `<p class="text-sm text-slate-300 italic">${testoFiltro || categorieFiltroCompilaPasto.size ? "Nessun risultato" : "Nessun altro alimento disponibile in dispensa"}</p>`}
    </div>
  `;
}

export function renderModalCompilaPasto() {
  const trovato = trovaPastoInCompilazione();
  if (!trovato) return;
  const { pasto, giorno } = trovato;

  const dataInizio = state.getSettimanaCorrente();
  const etichetta = dataInizio ? etichettaGiorno(dataInizio, giorno.giorno_settimana) : GIORNI_SETTIMANA[giorno.giorno_settimana];
  els.modalCompilaPastoTitolo.textContent = `${etichetta} · ${pasto.tipi_pasto?.nome ?? ""}`;

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
  categorieFiltroCompilaPasto = new Set();
  if (els.filtroCompilaPasto) els.filtroCompilaPasto.value = "";
  renderMenuFiltroCategoriaCompilaPasto();
  chiudiMenuFiltroCategoriaCompilaPasto();
  renderModalCompilaPasto();
  els.modalCompilaPasto.classList.remove("hidden");
}

export function chiudiCompilaPasto() {
  pastoInCompilazione = null;
  els.modalCompilaPasto.classList.add("hidden");
}

/* ── Filtro per categoria nel form di compilazione pasto (oltre alla ricerca testuale) ── */

function renderMenuFiltroCategoriaCompilaPasto() {
  const categorie = state.getCategorie();
  els.menuFiltroCategoriaCompilaPasto.innerHTML = categorie.length === 0
    ? `<p class="text-xs text-slate-400 px-3 py-2">Nessuna categoria ancora.</p>`
    : categorie.map((c) => {
        const attiva = categorieFiltroCompilaPasto.has(c.id);
        return `
          <button type="button" data-action="toggle-filtro-categoria-compila-pasto-voce" data-categoria-id="${c.id}"
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
              attiva ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700"
            }">
            <i class="fa-regular ${attiva ? "fa-square-check text-indigo-600" : "fa-square text-slate-300"}"></i>
            ${escapeHtml(c.nome)}
          </button>
        `;
      }).join("");

  els.btnFiltroCategoriaCompilaPasto.classList.toggle("text-indigo-600", categorieFiltroCompilaPasto.size > 0);
  els.btnFiltroCategoriaCompilaPasto.classList.toggle("text-slate-400", categorieFiltroCompilaPasto.size === 0);
}

export function toggleMenuFiltroCategoriaCompilaPasto() {
  els.menuFiltroCategoriaCompilaPasto.classList.toggle("hidden");
}

export function chiudiMenuFiltroCategoriaCompilaPasto() {
  els.menuFiltroCategoriaCompilaPasto.classList.add("hidden");
}

export function toggleFiltroCategoriaCompilaPasto(categoriaId) {
  if (categorieFiltroCompilaPasto.has(categoriaId)) categorieFiltroCompilaPasto.delete(categoriaId);
  else categorieFiltroCompilaPasto.add(categoriaId);
  renderMenuFiltroCategoriaCompilaPasto();
  renderModalCompilaPasto();
}

/* ── Modal: scegli le categorie di un alimento della dispensa (obbligatorio almeno una) ── */

let categorieAlimentoSelezionate = new Set();

function renderListaScegliCategorieAlimento() {
  const categorie = state.getCategorie();
  els.listaScegliCategorieAlimento.innerHTML = categorie.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-4">Nessuna categoria disponibile — creane una da Impostazioni.</p>`
    : categorie.map((c) => {
        const selezionata = categorieAlimentoSelezionate.has(c.id);
        return `
          <button type="button" data-action="toggle-scegli-categoria-alimento" data-categoria-id="${c.id}"
            class="w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
              selezionata ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700"
            }">
            <i class="fa-regular ${selezionata ? "fa-square-check text-indigo-600" : "fa-square text-slate-300"}"></i>
            ${escapeHtml(c.nome)}
          </button>
        `;
      }).join("");
}

function aggiornaBottoneCategorieAlimento() {
  const n = categorieAlimentoSelezionate.size;
  els.labelCategorieAlimento.textContent = n === 0 ? "Categoria" : n === 1 ? "1 categoria" : `${n} categorie`;
  els.btnScegliCategorieAlimento.classList.toggle("border-indigo-400", n > 0);
  els.btnScegliCategorieAlimento.classList.toggle("text-indigo-600", n > 0);
  els.btnScegliCategorieAlimento.classList.toggle("border-slate-300", n === 0);
  els.btnScegliCategorieAlimento.classList.toggle("text-slate-600", n === 0);
}

export function apriSceltaCategorieAlimento() {
  renderListaScegliCategorieAlimento();
  els.modalScegliCategorieAlimento.classList.remove("hidden");
}

export function chiudiSceltaCategorieAlimento() {
  els.modalScegliCategorieAlimento.classList.add("hidden");
  aggiornaBottoneCategorieAlimento();
}

export function toggleSceltaCategoriaAlimento(categoriaId) {
  if (categorieAlimentoSelezionate.has(categoriaId)) categorieAlimentoSelezionate.delete(categoriaId);
  else categorieAlimentoSelezionate.add(categoriaId);
  renderListaScegliCategorieAlimento();
}

export function getCategorieAlimentoSelezionate() {
  return Array.from(categorieAlimentoSelezionate);
}

export function impostaCategorieAlimentoSelezionate(ids) {
  categorieAlimentoSelezionate = new Set(ids);
  aggiornaBottoneCategorieAlimento();
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
      <details class="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden group">
        <summary class="bg-slate-50/80 px-3 py-2 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider cursor-pointer select-none flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
          <span>${escapeHtml(nomeCategoria)} <span class="font-normal normal-case text-slate-400">(${elenco.length})</span></span>
          <i class="fa-solid fa-chevron-right text-[10px] transition-transform group-open:rotate-90"></i>
        </summary>
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
      </details>
    `).join("");
}

export function apriModificaAlimento(alimento) {
  els.formNuovoAlimentoTitolo.textContent = "Modifica alimento";
  els.inputNomeAlimento.value = alimento.nome;
  impostaCategorieAlimentoSelezionate(alimento.categorie.map((c) => c.id));
  els.btnSalvaAlimento.textContent = "Salva modifiche";
  els.btnAnnullaModificaAlimento.classList.remove("hidden");
  els.inputNomeAlimento.focus();
}

export function resetFormAlimento() {
  els.formNuovoAlimentoTitolo.textContent = "Aggiungi alla dispensa";
  els.formNuovoAlimento.reset();
  impostaCategorieAlimentoSelezionate([]);
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

  aggiornaBadgeMancanti(stato.length);
}

/** Il numero sul bottone "Cosa mi manca" nella riga azioni del Piano. */
function aggiornaBadgeMancanti(n) {
  els.contaMancanti.classList.toggle("hidden", n === 0);
  els.contaMancanti.textContent = n;
}

export function apriCosaMiManca() {
  els.modalCosaMiManca.classList.remove("hidden");
}

export function chiudiCosaMiManca() {
  els.modalCosaMiManca.classList.add("hidden");
}

export function toggleMenuCompilaSettimana() {
  els.menuCompilaSettimana.classList.toggle("hidden");
}

export function chiudiMenuCompilaSettimana() {
  els.menuCompilaSettimana.classList.add("hidden");
}
  els.btnInviaAllaLista.textContent = numeroManca > 0 ? `Invia alla lista (${numeroManca})` : "Invia alla lista";
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
  els.modalCompilaTemplate.classList.remove("hidden");
}

export function chiudiModalCompilaTemplate() {
  els.modalCompilaTemplate.classList.add("hidden");
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
