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
  ui.renderChipCategorieNuovoAlimento();
  ui.renderListaAlimenti();
  ui.renderListaCategorieImpostazioni();
}

async function ricaricaPiani() {
  const casaId = getCasaId();
  const piani = await api.fetchPiani(casaId);
  state.setPiani(piani);
  ui.renderSelectPiani();

  // Se il piano corrente non esiste più (es. eliminato da un altro dispositivo), scegli il più recente.
  const correnteId = state.getPianoCorrenteId();
  if (correnteId && !piani.some((p) => p.id === correnteId)) {
    state.setPianoCorrenteId(piani[0]?.id ?? null);
  } else if (!correnteId && piani.length) {
    state.setPianoCorrenteId(piani[0].id);
  }
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

/* ── Piano: creazione ── */

async function handleNuovoPianoVuoto() {
  ui.chiudiMenuNuovoPiano();
  const nome = prompt("Nome del nuovo piano:", "Settimana normale");
  if (!nome) return;
  try {
    const pianoId = await api.createPianoVuoto(getCasaId(), nome.trim());
    await ricaricaPiani();
    state.setPianoCorrenteId(pianoId);
    ui.renderSelectPiani();
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

/**
 * Compila un piano da un template in un solo passo: il piano nasce
 * con le sezioni-categoria del template già al loro posto (es. "Lunedì
 * Pranzo" → Carboidrati + Verdura), pronte da riempire dalla vista
 * Piano — nessuna scelta di alimenti richiesta qui.
 */
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
    ui.renderSelectPiani();
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
    ui.renderSelectPiani();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nella creazione del piano: " + err.message);
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
    ui.renderSelectPiani();
    await ricaricaStrutturaPianoCorrente();
  } catch (err) {
    alert("Errore nell'eliminazione del piano: " + err.message);
  }
}

function handleSelectPianoCorrenteChange() {
  const id = ui.els.selectPianoCorrente.value || null;
  state.setPianoCorrenteId(id);
  ricaricaStrutturaPianoCorrente();
}

/* ── Piano: alimenti per pasto (con o senza sezione-categoria) ── */

function trovaTipoPastoNome(pastoId) {
  for (const giorno of state.getStrutturaPianoCorrente()) {
    const pasto = (giorno.piano_pasti ?? []).find((p) => p.id === pastoId);
    if (pasto) return pasto.tipi_pasto?.nome ?? "";
  }
  return "";
}

function trovaNomeCategoria(categoriaId) {
  if (!categoriaId) return null;
  return state.getCategorie().find((c) => c.id === categoriaId)?.nome ?? null;
}

function handleApriSceltaAlimento(pastoId, categoriaId) {
  ui.apriSceltaAlimento(pastoId, trovaTipoPastoNome(pastoId), categoriaId || null, trovaNomeCategoria(categoriaId));
}

async function handleScegliAlimentoPerPasto(pastoId, alimentoId, categoriaId) {
  try {
    await api.addAlimentoAPasto(pastoId, getCasaId(), alimentoId, categoriaId || null);
    ui.chiudiSceltaAlimento();
    await ricaricaStrutturaPianoCorrente();
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

/* ── Dispensa ── */

async function handleFormNuovoAlimento(event) {
  event.preventDefault();
  const nome = ui.els.inputNomeAlimento.value.trim();
  if (!nome) return;
  const categoriaIds = ui.leggiCategorieSelezionate(ui.els.chipCategorieNuovoAlimento);

  try {
    await api.createAlimento(getCasaId(), nome, categoriaIds);
    ui.els.formNuovoAlimento.reset();
    await ricaricaDispensa();
  } catch (err) {
    alert("Errore nell'aggiungere l'alimento: " + err.message);
  }
}

async function handleEliminaAlimento(alimentoId) {
  if (!confirm("Eliminare questo alimento dalla dispensa? Verrà tolto anche dai piani che lo usano.")) return;
  try {
    await api.deleteAlimento(alimentoId);
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
    await ricaricaStatoMancanti();
  } catch (err) {
    alert("Errore nella generazione della checklist: " + err.message);
  }
}

function handleMancanteManca(statoId, nome) {
  listaSpesaApp.apriModaleNuovoProdotto(nome, async () => {
    try {
      await api.deleteStatoMancante(statoId);
      await ricaricaStatoMancanti();
    } catch (err) {
      console.error("Errore nella rimozione dalla checklist:", err);
    }
  });
}

async function handleMancanteCeLho(statoId) {
  try {
    await api.deleteStatoMancante(statoId);
    await ricaricaStatoMancanti();
  } catch (err) {
    alert("Errore: " + err.message);
  }
}

/* ── Impostazioni: categorie ── */

async function handleFormNuovaCategoria(event) {
  event.preventDefault();
  const nome = ui.els.inputNuovaCategoria.value.trim();
  if (!nome) return;
  try {
    await api.createCategoria(nome);
    ui.els.formNuovaCategoria.reset();
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

/* ── Template ── */

async function handleEliminaTemplate(templateId, nome) {
  if (!confirm(`Eliminare il template "${nome}"?`)) return;
  try {
    await api.deleteTemplate(templateId);
    await ricaricaTemplates();
  } catch (err) {
    alert("Errore nell'eliminazione: " + err.message);
  }
}

/* ── Costruttore "Nuovo template" ── */

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
  ui.apriModalNuovoTemplate();
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

async function handleTemplateAggiungiPasto(giornoId, tipoPastoId) {
  if (!tipoPastoId) return;
  try {
    await api.addPastoATemplate(giornoId, getCasaId(), tipoPastoId);
    await ricaricaStrutturaTemplateInCostruzione();
  } catch (err) {
    alert("Errore nell'aggiungere il pasto: " + err.message);
  }
}

async function handleTemplateRimuoviPasto(pastoId) {
  try {
    await api.removePastoDaTemplate(pastoId);
    await ricaricaStrutturaTemplateInCostruzione();
  } catch (err) {
    alert("Errore nella rimozione: " + err.message);
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

async function handleTemplateSceltaCategoria(pastoId, categoriaId) {
  try {
    await api.addCategoriaAPasto(pastoId, getCasaId(), categoriaId);
    ui.chiudiSceltaCategoriaTemplate();
    await ricaricaStrutturaTemplateInCostruzione();
  } catch (err) {
    alert("Errore nell'aggiungere la categoria: " + err.message);
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
    // Click fuori dal menu "Nuovo piano": lo chiude (no-op se già chiuso).
    if (!event.target.closest("#menuNuovoPiano") && !event.target.closest('[data-action="toggle-menu-nuovo-piano"]')) {
      ui.chiudiMenuNuovoPiano();
    }

    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, pastoId, rigaId, alimentoId, categoriaId, statoId, nome, templateId, giornoId, vista } = target.dataset;

    switch (action) {
      case "sotto-vista":
        ui.mostraSottoVista(vista);
        if (vista === "mancanti") ricaricaStatoMancanti();
        return;

      case "toggle-categoria-chip": return ui.toggleChipCategoria(target);

      case "toggle-menu-nuovo-piano": return ui.toggleMenuNuovoPiano();
      case "nuovo-piano-vuoto": return handleNuovoPianoVuoto();
      case "apri-compila-template": return handleApriCompilaTemplate();
      case "chiudi-compila-template": return ui.chiudiModalCompilaTemplate();
      case "conferma-compila-template": return handleConfermaCompilaTemplate();
      case "apri-compila-precedente": return handleApriCompilaPrecedente();
      case "chiudi-compila-precedente": return ui.chiudiModalCompilaPrecedente();
      case "conferma-compila-precedente": return handleConfermaCompilaPrecedente();
      case "elimina-piano-corrente": return handleEliminaPianoCorrente();

      case "apri-scegli-alimento": return handleApriSceltaAlimento(pastoId, categoriaId);
      case "chiudi-scegli-alimento": return ui.chiudiSceltaAlimento();
      case "scegli-alimento-per-pasto": return handleScegliAlimentoPerPasto(pastoId, alimentoId, categoriaId);
      case "rimuovi-alimento-da-pasto": return handleRimuoviAlimentoDaPasto(rigaId);

      case "elimina-alimento": return handleEliminaAlimento(alimentoId);

      case "genera-mancanti": return handleGeneraMancanti();
      case "mancante-manca": return handleMancanteManca(statoId, nome);
      case "mancante-ce-lho": return handleMancanteCeLho(statoId);

      case "elimina-categoria": return handleEliminaCategoria(categoriaId, nome);
      case "elimina-template": return handleEliminaTemplate(templateId, nome);

      case "apri-nuovo-template": return handleApriNuovoTemplate();
      case "crea-nuovo-template": return handleCreaNuovoTemplate();
      case "chiudi-nuovo-template": return handleChiudiNuovoTemplate();
      case "template-rimuovi-pasto": return handleTemplateRimuoviPasto(pastoId);
      case "template-apri-scegli-categoria": return handleTemplateApriSceltaCategoria(pastoId);
      case "chiudi-scegli-categoria-template": return ui.chiudiSceltaCategoriaTemplate();
      case "template-scegli-categoria": return handleTemplateSceltaCategoria(pastoId, categoriaId);
      case "template-rimuovi-categoria": return handleTemplateRimuoviCategoria(rigaId);
    }
  });

  document.body.addEventListener("change", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, giornoId } = target.dataset;

    if (action === "template-aggiungi-pasto") {
      const tipoPastoId = target.value;
      target.value = ""; // torna sul placeholder "+ pasto"
      return handleTemplateAggiungiPasto(giornoId, tipoPastoId);
    }
  });

  ui.els.selectPianoCorrente.addEventListener("change", handleSelectPianoCorrenteChange);
  ui.els.formNuovoAlimento.addEventListener("submit", handleFormNuovoAlimento);
  ui.els.formNuovaCategoria.addEventListener("submit", handleFormNuovaCategoria);
}

export async function init(casaId) {
  bindEventi();
  await ricaricaTutto();
  api.subscribeMealplanRealtime(casaId, () => ricaricaTutto());
}
