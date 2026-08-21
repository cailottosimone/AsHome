// js/mealplan-app.js
// Coordina stato (mealplan-state.js), backend (mealplan-api.js) e
// interfaccia (mealplan-ui.js) del Piano Alimentare. Comunica con la
// Lista della Spesa solo tramite le funzioni pure/esportate già
// esistenti (normalizza(), apriModaleNuovoProdotto()), mai leggendo o
// scrivendo direttamente lo stato di state.js: sono due app che si
// parlano attraverso un'interfaccia esplicita, non due app fuse insieme.

import * as api from "./mealplan-api.js";
import * as state from "./mealplan-state.js";
import * as ui from "./mealplan-ui.js";
import * as listaSpesaApp from "./app.js";
import { getCasaId } from "./session-state.js";

async function ricaricaTipiPasto() {
  const tipiPasto = await api.fetchTipiPasto();
  state.setTipiPasto(tipiPasto);
}

async function ricaricaDispensa() {
  const casaId = getCasaId();
  const [categorie, alimenti] = await Promise.all([api.fetchCategorie(), api.fetchAlimenti(casaId)]);
  state.setCategorie(categorie);
  state.setAlimenti(alimenti);
  ui.renderListaAlimenti();
  ui.renderListaCategorieImpostazioni();
  if (!state.getEditingAlimentoId()) ui.renderChipCategorieNuovoAlimento();
}

async function ricaricaPiani() {
  const casaId = getCasaId();
  const piani = await api.fetchPiani(casaId);
  state.setPiani(piani);

  const correnteId = state.getPianoCorrenteId();
  if (correnteId && !piani.some((p) => p.id === correnteId)) {
    state.setPianoCorrenteId(piani[0]?.id ?? null);
  } else if (!correnteId && piani.length) {
    state.setPianoCorrenteId(piani[0].id);
  }
  ui.renderMenuPiano();
}

async function ricaricaStrutturaPianoCorrente() {
  const pianoId = state.getPianoCorrenteId();
  if (!pianoId) {
    state.setStrutturaPianoCorrente([]);
    ui.renderGrigliaPiano();
    return;
  }
  const struttura = await api.fetchPianoCompleto(pianoId);
  state.setStrutturaPianoCorrente(struttura);
  ui.renderGrigliaPiano();
}

async function ricaricaTemplates() {
  const templates = await api.fetchTemplates();
  state.setTemplates(templates);
  ui.renderSelectTemplates();
  ui.renderListaTemplate();
}

async function ricaricaStatoMancanti() {
  const pianoId = state.getPianoCorrenteId();
  if (!pianoId) {
    state.setStatoMancanti([]);
    ui.renderListaMancanti();
    return;
  }
  const stato = await api.fetchStatoMancanti(pianoId);
  state.setStatoMancanti(stato);
  ui.renderListaMancanti();
}

async function ricaricaTutto() {
  await Promise.all([ricaricaDispensa(), ricaricaPiani(), ricaricaTemplates(), ricaricaTipiPasto()]);
  await ricaricaStrutturaPianoCorrente();
  if (state.getSottoVista() === "mancanti") await ricaricaStatoMancanti();
}

/* ── Piano: creazione, selezione, rinomina ── */

async function handleNuovoPianoVuoto() {
  ui.chiudiMenuNuovoPiano();
  const nome = prompt("Nome del nuovo piano:", "Settimana normale");
  if (!nome) return;
  try {
    const pianoId = await api.createPianoVuoto(getCasaId(), nome.trim());
    await ricaricaPiani();
    state.setPianoCorrenteId(pianoId);
    ui.renderMenuPiano();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nella creazione del piano: " + err.message);
  }
}

function handleApriCompilaTemplate() {
  ui.chiudiMenuNuovoPiano();
  ui.renderSelectTemplates();
  ui.apriModalCompilaTemplate();
}

async function handleConfermaCompilaTemplate() {
  const templateId = ui.els.selectTemplateDaUsare.value;
  const nome = ui.els.inputNomeNuovoPianoDaTemplate.value.trim();
  if (!templateId || !nome) {
    alert("Scegli un template e dai un nome al piano.");
    return;
  }

  try {
    const pianoId = await api.compilaDaTemplate(getCasaId(), nome, templateId);
    ui.chiudiModalCompilaTemplate();
    state.setPianoCorrenteId(pianoId);
    await ricaricaPiani();
    ui.renderMenuPiano();
    await ricaricaStrutturaPianoCorrente();
    ui.mostraSottoVista("piano");
  } catch (err) {
    alert("Errore nella creazione del piano: " + err.message);
  }
}

function handleApriCompilaPrecedente() {
  ui.chiudiMenuNuovoPiano();
  ui.renderSelectPianoOrigine();
  ui.apriModalCompilaPrecedente();
}

async function handleConfermaCompilaPrecedente() {
  const pianoOrigineId = ui.els.selectPianoOrigine.value;
  const nome = ui.els.inputNomeNuovoPianoDaPrecedente.value.trim();
  if (!pianoOrigineId || !nome) {
    alert("Scegli un piano di partenza e dai un nome al nuovo piano.");
    return;
  }

  try {
    const pianoId = await api.compilaDaSettimanaPrecedente(getCasaId(), nome, pianoOrigineId);
    ui.chiudiModalCompilaPrecedente();
    state.setPianoCorrenteId(pianoId);
    await ricaricaPiani();
    ui.renderMenuPiano();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nella creazione del piano: " + err.message);
  }
}

function handleSelezionaPiano(pianoId) {
  ui.chiudiMenuPiano();
  state.setPianoCorrenteId(pianoId);
  ui.renderMenuPiano();
  ricaricaStrutturaPianoCorrente();
}

async function handleRinominaPianoCorrente() {
  const pianoId = state.getPianoCorrenteId();
  if (!pianoId) return;
  const pianoCorrente = state.getPiani().find((p) => p.id === pianoId);
  const nome = prompt("Nuovo nome del piano:", pianoCorrente?.nome ?? "");
  if (!nome || !nome.trim()) return;
  try {
    await api.renamePiano(pianoId, nome.trim());
    await ricaricaPiani();
  } catch (err) {
    alert("Errore nella rinomina: " + err.message);
  }
}

async function handleEliminaPianoCorrente() {
  const pianoId = state.getPianoCorrenteId();
  if (!pianoId) return;
  if (!confirm("Eliminare questo piano? Non si può annullare.")) return;

  try {
    await api.deletePiano(pianoId);
    state.setPianoCorrenteId(null);
    await ricaricaPiani();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nell'eliminazione del piano: " + err.message);
  }
}

/* ── Piano: compilare un pasto (un solo form, tutte le sue categorie) ── */

function handleApriCompilaPasto(pastoId) {
  ui.apriCompilaPasto(pastoId);
}

async function handleAggiungiInCompilaPasto(pastoId, alimentoId, categoriaId) {
  try {
    await api.addAlimentiAPasto(pastoId, getCasaId(), [alimentoId], categoriaId || null);
    await ricaricaStrutturaPianoCorrente(); // ri-renderizza anche il form aperto
  } catch (err) {
    alert("Errore nell'aggiungere l'alimento: " + err.message);
  }
}

async function handleRimuoviAlimentoDaPasto(rigaId) {
  try {
    await api.removeAlimentoDaPasto(rigaId);
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nella rimozione: " + err.message);
  }
}

/* ── Dispensa: crea o modifica un alimento ── */

async function handleFormNuovoAlimento(event) {
  event.preventDefault();
  const nome = ui.els.inputNomeAlimento.value.trim();
  if (!nome) return;
  const categoriaIds = ui.leggiCategorieSelezionate(ui.els.chipCategorieNuovoAlimento);
  const editingId = state.getEditingAlimentoId();

  try {
    if (editingId) {
      await api.updateAlimento(editingId, getCasaId(), nome, categoriaIds);
      state.setEditingAlimentoId(null);
    } else {
      await api.createAlimento(getCasaId(), nome, categoriaIds);
    }
    ui.resetFormAlimento();
    await ricaricaDispensa();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nel salvataggio: " + err.message);
  }
}

function handleModificaAlimento(alimentoId) {
  const alimento = state.findAlimento(alimentoId);
  if (!alimento) return;
  state.setEditingAlimentoId(alimentoId);
  ui.apriModificaAlimento(alimento);
}

function handleAnnullaModificaAlimento() {
  state.setEditingAlimentoId(null);
  ui.resetFormAlimento();
}

async function handleEliminaAlimento(alimentoId) {
  if (!confirm("Eliminare questo alimento dalla dispensa? Verrà tolto anche dai piani che lo usano.")) return;
  try {
    await api.deleteAlimento(alimentoId);
    if (state.getEditingAlimentoId() === alimentoId) {
      state.setEditingAlimentoId(null);
      ui.resetFormAlimento();
    }
    await ricaricaDispensa();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

/* ── Cosa mi manca ── */

async function handleGeneraMancanti() {
  const pianoId = state.getPianoCorrenteId();
  if (!pianoId) {
    alert("Seleziona prima un piano nella vista Piano.");
    return;
  }
  try {
    await api.generaStatoMancanti(pianoId, getCasaId());
    state.resetDecisioniMancanti();
    await ricaricaStatoMancanti();
  } catch (err) {
    alert("Errore nella generazione della checklist: " + err.message);
  }
}

/** Segna solo localmente la decisione: nessuna scrittura finché non si preme "Invia alla lista". */
function handleSegnaDecisioneMancante(statoId, decisione) {
  state.setDecisioneMancante(statoId, decisione);
  ui.renderListaMancanti();
}

/**
 * Elabora la coda dei "Manca" uno alla volta: apre per ciascuno lo
 * stesso modulo di sempre (quantità, negozio, note); solo dopo un
 * salvataggio riuscito passa al successivo. Se l'utente annulla un
 * popup a metà, la coda si ferma lì: gli elementi non ancora
 * processati restano nella checklist, ancora segnati "Manca", pronti
 * per un altro "Invia alla lista".
 */
async function elaboraCodaManca(coda) {
  if (coda.length === 0) {
    state.resetDecisioniMancanti();
    await ricaricaStatoMancanti();
    return;
  }
  const [primo, ...resto] = coda;
  listaSpesaApp.apriModaleNuovoProdotto(primo.nome, async () => {
    try {
      await api.deleteStatoMancante(primo.id);
    } catch (err) {
      console.error("Errore nella rimozione dalla checklist:", err);
    }
    await elaboraCodaManca(resto);
  });
}

async function handleInviaMancantiAllaLista() {
  const stato = state.getStatoMancanti();
  const decisioni = state.getDecisioniMancanti();

  const idsCeLho = stato.filter((s) => decisioni.get(s.id) === "ce_lho").map((s) => s.id);
  const codaManca = stato.filter((s) => decisioni.get(s.id) === "manca");

  if (idsCeLho.length) {
    try {
      await api.deleteStatiMancanti(idsCeLho);
    } catch (err) {
      alert("Errore nella rimozione: " + err.message);
    }
  }

  if (codaManca.length === 0) {
    state.resetDecisioniMancanti();
    await ricaricaStatoMancanti();
    return;
  }
  await elaboraCodaManca(codaManca);
}

/* ── Impostazioni: categorie ── */

async function handleApriNuovaCategoria() {
  const nome = prompt("Nome della nuova categoria:");
  if (!nome || !nome.trim()) return;
  try {
    await api.createCategoria(nome.trim());
    await ricaricaDispensa();
  } catch (err) {
    alert("Errore nell'aggiungere la categoria: " + err.message);
  }
}

async function handleEliminaCategoria(categoriaId, nome) {
  if (!confirm(`Eliminare "${nome}"? È condivisa tra tutte le Case: sparirà da ogni alimento e template che la usa, ovunque.`)) return;
  try {
    await api.deleteCategoria(categoriaId);
    await ricaricaDispensa();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

/* ── Template: elenco, eliminazione ── */

async function handleEliminaTemplate(templateId, nome) {
  if (!confirm(`Eliminare il template "${nome}"? I piani già creati da esso non vengono toccati.`)) return;
  try {
    await api.deleteTemplate(templateId);
    await ricaricaTemplates();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

/* ── Template: costruttore (creazione E modifica, stesso modale) ── */

async function ricaricaStrutturaTemplateInCostruzione() {
  const templateId = state.getTemplateInCostruzioneId();
  if (!templateId) return;
  const struttura = await api.fetchTemplateCompleto(templateId);
  state.setStrutturaTemplateInCostruzione(struttura);
  ui.renderGrigliaNuovoTemplate();
}

function handleApriNuovoTemplate() {
  state.setTemplateInCostruzioneId(null);
  state.setStrutturaTemplateInCostruzione([]);
  ui.apriModalTemplateNuovo();
}

async function handleModificaTemplate(templateId) {
  const template = state.getTemplates().find((t) => t.id === templateId);
  if (!template) return;
  state.setTemplateInCostruzioneId(templateId);
  ui.apriModalTemplateEsistente(template.nome);
  await ricaricaStrutturaTemplateInCostruzione();
}

async function handleCreaNuovoTemplate() {
  const nome = ui.els.inputNomeNuovoTemplate.value.trim();
  if (!nome) {
    alert("Dai un nome al template.");
    return;
  }
  try {
    const templateId = await api.createTemplate(getCasaId(), nome);
    state.setTemplateInCostruzioneId(templateId);
    ui.mostraGrigliaNuovoTemplate();
    await ricaricaStrutturaTemplateInCostruzione();
  } catch (err) {
    alert("Errore nella creazione del template: " + err.message);
  }
}

async function handleRinominaTemplateInCorso() {
  const templateId = state.getTemplateInCostruzioneId();
  const nome = ui.els.inputNomeNuovoTemplate.value.trim();
  if (!templateId || !nome) return;
  try {
    await api.renameTemplate(templateId, nome);
    await ricaricaTemplates();
  } catch (err) {
    alert("Errore nella rinomina: " + err.message);
  }
}

function trovaCategorieGiaPresenti(pastoId) {
  for (const giorno of state.getStrutturaTemplateInCostruzione()) {
    const pasto = (giorno.template_pasti ?? []).find((p) => p.id === pastoId);
    if (pasto) return (pasto.template_pasto_categorie ?? []).map((c) => c.categoria_id);
  }
  return [];
}

function handleTemplateApriSceltaCategoria(pastoId) {
  ui.apriSceltaCategoriaTemplate(pastoId, trovaCategorieGiaPresenti(pastoId));
}

async function handleConfermaSceltaCategorieTemplate() {
  const { pastoId, categoriaIds } = ui.leggiEChiudiSceltaCategorieTemplate();
  if (!pastoId || categoriaIds.length === 0) return;
  try {
    await api.addCategorieAPasto(pastoId, getCasaId(), categoriaIds);
    await ricaricaStrutturaTemplateInCostruzione();
  } catch (err) {
    alert("Errore nell'aggiungere le categorie: " + err.message);
  }
}

async function handleTemplateRimuoviCategoria(rigaId) {
  try {
    await api.removeCategoriaDaPasto(rigaId);
    await ricaricaStrutturaTemplateInCostruzione();
  } catch (err) {
    alert("Errore nella rimozione: " + err.message);
  }
}

async function handleChiudiNuovoTemplate() {
  ui.chiudiModalNuovoTemplate();
  state.setTemplateInCostruzioneId(null);
  await ricaricaTemplates();
}

/* ── Binding eventi ── */

function bindEventi() {
  document.body.addEventListener("click", (event) => {
    // Click fuori dal menu piano (switch): lo chiude (no-op se già chiuso).
    if (!event.target.closest("#menuPiano") && !event.target.closest('[data-action="toggle-menu-piano"]')) {
      ui.chiudiMenuPiano();
    }
    // Stessa cosa per il menu "Nuovo piano", indipendente dal primo.
    if (!event.target.closest("#menuNuovoPiano") && !event.target.closest('[data-action="toggle-menu-nuovo-piano"]')) {
      ui.chiudiMenuNuovoPiano();
    }

    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, pastoId, rigaId, alimentoId, categoriaId, statoId, nome, templateId, pianoId, vista } = target.dataset;

    switch (action) {
      case "sotto-vista":
        ui.mostraSottoVista(vista);
        if (vista === "mancanti") ricaricaStatoMancanti();
        return;

      case "toggle-categoria-chip": return ui.toggleChipCategoria(target);

      case "toggle-menu-piano": return ui.toggleMenuPiano();
      case "seleziona-piano": return handleSelezionaPiano(pianoId);
      case "toggle-menu-nuovo-piano": return ui.toggleMenuNuovoPiano();
      case "nuovo-piano-vuoto": return handleNuovoPianoVuoto();
      case "apri-compila-template": return handleApriCompilaTemplate();
      case "chiudi-compila-template": return ui.chiudiModalCompilaTemplate();
      case "conferma-compila-template": return handleConfermaCompilaTemplate();
      case "apri-compila-precedente": return handleApriCompilaPrecedente();
      case "chiudi-compila-precedente": return ui.chiudiModalCompilaPrecedente();
      case "conferma-compila-precedente": return handleConfermaCompilaPrecedente();
      case "rinomina-piano-corrente": return handleRinominaPianoCorrente();
      case "elimina-piano-corrente": return handleEliminaPianoCorrente();

      case "apri-compila-pasto": return handleApriCompilaPasto(pastoId);
      case "chiudi-compila-pasto": return ui.chiudiCompilaPasto();
      case "aggiungi-in-compila-pasto": return handleAggiungiInCompilaPasto(pastoId, alimentoId, categoriaId);
      case "rimuovi-alimento-da-pasto": return handleRimuoviAlimentoDaPasto(rigaId);

      case "modifica-alimento": return handleModificaAlimento(alimentoId);
      case "annulla-modifica-alimento": return handleAnnullaModificaAlimento();
      case "elimina-alimento": return handleEliminaAlimento(alimentoId);

      case "genera-mancanti": return handleGeneraMancanti();
      case "segna-decisione-mancante": return handleSegnaDecisioneMancante(statoId, target.dataset.decisione);
      case "invia-mancanti-alla-lista": return handleInviaMancantiAllaLista();

      case "apri-nuova-categoria": return handleApriNuovaCategoria();
      case "elimina-categoria": return handleEliminaCategoria(categoriaId, nome);
      case "elimina-template": return handleEliminaTemplate(templateId, nome);

      case "apri-nuovo-template": return handleApriNuovoTemplate();
      case "modifica-template": return handleModificaTemplate(templateId);
      case "crea-nuovo-template": return handleCreaNuovoTemplate();
      case "chiudi-nuovo-template": return handleChiudiNuovoTemplate();
      case "template-apri-scegli-categoria": return handleTemplateApriSceltaCategoria(pastoId);
      case "chiudi-scegli-categoria-template": return ui.chiudiSceltaCategoriaTemplate();
      case "toggle-scegli-categoria-template": return ui.toggleSceltaCategoriaTemplate(categoriaId);
      case "conferma-scegli-categorie-template": return handleConfermaSceltaCategorieTemplate();
      case "template-rimuovi-categoria": return handleTemplateRimuoviCategoria(rigaId);
    }
  });

  ui.els.formNuovoAlimento.addEventListener("submit", handleFormNuovoAlimento);
  ui.els.inputNomeNuovoTemplate.addEventListener("change", handleRinominaTemplateInCorso);
  ui.els.filtroCompilaPasto.addEventListener("input", (e) => ui.filtraCompilaPasto(e.target.value));
}

export async function init(casaId) {
  bindEventi();
  await ricaricaTutto();
  api.subscribeMealplanRealtime(casaId, () => ricaricaTutto());
}
