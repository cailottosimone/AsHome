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
import { lunediDellaSettimana, aggiungiSettimane } from "./date-utils.js";

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
}

async function ricaricaStrutturaPianoCorrente() {
  const pianoId = state.getPianoIdSettimanaCorrente();
  if (!pianoId) {
    state.setStrutturaPianoCorrente([]);
    ui.renderGrigliaPiano();
    return;
  }
  const struttura = await api.fetchPianoCompleto(pianoId);
  state.setStrutturaPianoCorrente(struttura);
  ui.renderGrigliaPiano();
}

/** Ricarica tutto ciò che riguarda la settimana attualmente visualizzata:
 *  se esiste già una riga per lei, la sua struttura; se non esiste
 *  ancora, resta "virtuale" (vedi renderGrigliaPiano) finché non si
 *  tocca davvero un pasto. Aggiorna anche se esiste una settimana
 *  precedente popolata (per abilitare "Dalla settimana precedente"). */
async function ricaricaSettimanaCorrente() {
  const casaId = getCasaId();
  const dataInizio = state.getSettimanaCorrente();

  const esistente = await api.fetchSettimana(casaId, dataInizio);
  state.setPianoIdSettimanaCorrente(esistente ? esistente.id : null);
  await ricaricaStrutturaPianoCorrente();

  const precedente = await api.fetchSettimanaPrecedentePopolata(casaId, dataInizio);
  state.setSettimanaPrecedentePopolata(precedente);
  ui.renderNavigatoreSettimana();
}

async function ricaricaTemplates() {
  const templates = await api.fetchTemplates();
  state.setTemplates(templates);
  ui.renderSelectTemplates();
  ui.renderListaTemplate();
}

async function ricaricaStatoMancanti() {
  const pianoId = state.getPianoIdSettimanaCorrente();
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
  await Promise.all([ricaricaDispensa(), ricaricaTemplates(), ricaricaTipiPasto()]);
  await ricaricaSettimanaCorrente();
  if (state.getSottoVista() === "mancanti") await ricaricaStatoMancanti();
}

/* ── Navigazione tra settimane ── */

async function navigaASettimana(dataInizio) {
  state.setSettimanaCorrente(dataInizio);
  await ricaricaSettimanaCorrente();
}

function handleSettimanaPrecedente() {
  navigaASettimana(aggiungiSettimane(state.getSettimanaCorrente(), -1));
}

function handleSettimanaSuccessiva() {
  navigaASettimana(aggiungiSettimane(state.getSettimanaCorrente(), 1));
}

/* ── Compilare la settimana: da template, dalla precedente, a mano ── */

function handleApriCompilaTemplate() {
  ui.renderSelectTemplates();
  ui.apriModalCompilaTemplate();
}

async function handleConfermaCompilaTemplate() {
  const templateId = ui.els.selectTemplateDaUsare.value;
  if (!templateId) {
    alert("Scegli un template.");
    return;
  }
  try {
    await api.compilaDaTemplate(getCasaId(), state.getSettimanaCorrente(), templateId);
    ui.chiudiModalCompilaTemplate();
    await ricaricaSettimanaCorrente();
  } catch (err) {
    alert("Errore nell'applicare il template: " + err.message);
  }
}

async function handleCompilaDaSettimanaPrecedente() {
  const precedente = state.getSettimanaPrecedentePopolata();
  if (!precedente) return;
  try {
    await api.compilaDaSettimanaPrecedente(getCasaId(), state.getSettimanaCorrente(), precedente.id);
    await ricaricaSettimanaCorrente();
  } catch (err) {
    alert("Errore nel copiare dalla settimana precedente: " + err.message);
  }
}

async function handleSvuotaSettimanaCorrente() {
  const pianoId = state.getPianoIdSettimanaCorrente();
  if (!pianoId) return;
  if (!confirm("Svuotare questa settimana? Non si può annullare.")) return;
  try {
    await api.svuotaSettimana(pianoId);
    state.setPianoIdSettimanaCorrente(null);
    await ricaricaSettimanaCorrente();
  } catch (err) {
    alert("Errore nello svuotare la settimana: " + err.message);
  }
}

/* ── Piano: compilare un pasto (un solo form, tutte le sue categorie) ── */

/** Trova l'id reale di un pasto (giorno+tipo) nella struttura già caricata. */
function trovaPianoPastoId(giornoSettimana, tipoPastoId) {
  for (const giorno of state.getStrutturaPianoCorrente()) {
    if (giorno.giorno_settimana !== giornoSettimana) continue;
    const pasto = (giorno.piano_pasti ?? []).find((p) => p.tipo_pasto_id === tipoPastoId);
    if (pasto) return pasto.id;
  }
  return null;
}

async function handleApriCompilaPasto(pastoId, giornoSettimana, tipoPastoId) {
  if (!pastoId) {
    // Prima interazione su questa settimana: la creo ora (con tutto lo
    // scheletro), poi risolvo l'id reale del pasto appena toccato.
    try {
      const nuovoPianoId = await api.assicuraSettimana(getCasaId(), state.getSettimanaCorrente());
      state.setPianoIdSettimanaCorrente(nuovoPianoId);
      await ricaricaStrutturaPianoCorrente();
      pastoId = trovaPianoPastoId(Number(giornoSettimana), tipoPastoId);
    } catch (err) {
      alert("Errore nel preparare la settimana: " + err.message);
      return;
    }
  }
  if (!pastoId) {
    alert("Errore imprevisto nell'aprire il pasto.");
    return;
  }
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
  const categoriaIds = ui.getCategorieAlimentoSelezionate();
  if (categoriaIds.length === 0) {
    alert("Scegli almeno una categoria per questo alimento.");
    return;
  }
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
  const pianoId = state.getPianoIdSettimanaCorrente();
  if (!pianoId) {
    alert("Questa settimana non ha ancora nulla di pianificato.");
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

/* ── Template: elenco, eliminazione ── */

async function handleEliminaTemplate(templateId, nome) {
  if (!confirm(`Eliminare il template "${nome}"? Le settimane già compilate da esso non vengono toccate.`)) return;
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
    // Click fuori dal popover filtro-categoria del compila-pasto: lo chiude.
    if (!event.target.closest("#menuFiltroCategoriaCompilaPasto") && !event.target.closest('[data-action="toggle-filtro-categoria-compila-pasto"]')) {
      ui.chiudiMenuFiltroCategoriaCompilaPasto();
    }

    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, pastoId, rigaId, alimentoId, categoriaId, statoId, nome, templateId, giornoSettimana, tipoPastoId, vista } = target.dataset;

    switch (action) {
      case "sotto-vista":
        ui.mostraSottoVista(vista);
        if (vista === "mancanti") ricaricaStatoMancanti();
        return;

      case "apri-scegli-categorie-alimento": return ui.apriSceltaCategorieAlimento();
      case "chiudi-scegli-categorie-alimento": return ui.chiudiSceltaCategorieAlimento();
      case "toggle-scegli-categoria-alimento": return ui.toggleSceltaCategoriaAlimento(categoriaId);

      case "settimana-precedente": return handleSettimanaPrecedente();
      case "settimana-successiva": return handleSettimanaSuccessiva();
      case "apri-compila-template": return handleApriCompilaTemplate();
      case "chiudi-compila-template": return ui.chiudiModalCompilaTemplate();
      case "conferma-compila-template": return handleConfermaCompilaTemplate();
      case "compila-da-settimana-precedente": return handleCompilaDaSettimanaPrecedente();
      case "svuota-settimana-corrente": return handleSvuotaSettimanaCorrente();

      case "apri-compila-pasto": return handleApriCompilaPasto(pastoId, giornoSettimana, tipoPastoId);
      case "chiudi-compila-pasto": return ui.chiudiCompilaPasto();
      case "toggle-filtro-categoria-compila-pasto": return ui.toggleMenuFiltroCategoriaCompilaPasto();
      case "toggle-filtro-categoria-compila-pasto-voce": return ui.toggleFiltroCategoriaCompilaPasto(categoriaId);
      case "aggiungi-in-compila-pasto": return handleAggiungiInCompilaPasto(pastoId, alimentoId, categoriaId);
      case "rimuovi-alimento-da-pasto": return handleRimuoviAlimentoDaPasto(rigaId);

      case "modifica-alimento": return handleModificaAlimento(alimentoId);
      case "annulla-modifica-alimento": return handleAnnullaModificaAlimento();
      case "elimina-alimento": return handleEliminaAlimento(alimentoId);

      case "genera-mancanti": return handleGeneraMancanti();
      case "segna-decisione-mancante": return handleSegnaDecisioneMancante(statoId, target.dataset.decisione);
      case "invia-mancanti-alla-lista": return handleInviaMancantiAllaLista();

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
  state.setSettimanaCorrente(lunediDellaSettimana(new Date()));
  await ricaricaTutto();
  api.subscribeMealplanRealtime(casaId, () => ricaricaTutto());
}
