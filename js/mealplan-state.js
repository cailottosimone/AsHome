// js/mealplan-state.js
// Stato in memoria del Piano Alimentare: dispensa, piani, template,
// checklist "Cosa mi manca". Segue lo stesso pattern di state.js
// (specchio locale per il rendering, la fonte di verità resta Supabase).

const state = {
  categorie: [],
  alimenti: [],
  tipiPasto: [],
  templates: [],

  settimanaCorrente: null, // data ISO (YYYY-MM-DD) del lunedì della settimana visualizzata
  pianoIdSettimanaCorrente: null, // id della riga piani per questa settimana, null se non ancora toccata
  settimanaPrecedentePopolata: null, // { id, data_inizio } dell'ultima settimana popolata prima di questa, o null
  strutturaPianoCorrente: [], // giorni → pasti → alimenti, da fetchPianoCompleto()

  statoMancanti: [], // checklist del piano corrente
  decisioniMancanti: new Map(), // statoId -> "manca" | "ce_lho", solo locale finché non si preme "Invia alla lista"

  sottoVista: "piano", // "piano" | "dispensa" | "template" | "mancanti" | "impostazioni"

  templateInCostruzioneId: null,
  strutturaTemplateInCostruzione: [], // giorni → pasti → categorie, mentre si costruisce/modifica un template

  editingAlimentoId: null, // alimento in modifica nel form della dispensa (null = si sta creando uno nuovo)
};

export function setCategorie(c) { state.categorie = c; }
export function getCategorie() { return state.categorie; }

export function setAlimenti(a) { state.alimenti = a; }
export function getAlimenti() { return state.alimenti; }
export function findAlimento(id) { return state.alimenti.find((a) => a.id === id); }

export function setEditingAlimentoId(id) { state.editingAlimentoId = id; }
export function getEditingAlimentoId() { return state.editingAlimentoId; }

export function setTipiPasto(t) { state.tipiPasto = t; }
export function getTipiPasto() { return state.tipiPasto; }

export function setTemplates(t) { state.templates = t; }
export function getTemplates() { return state.templates; }

export function setSettimanaCorrente(dataISO) { state.settimanaCorrente = dataISO; }
export function getSettimanaCorrente() { return state.settimanaCorrente; }

export function setPianoIdSettimanaCorrente(id) { state.pianoIdSettimanaCorrente = id; }
export function getPianoIdSettimanaCorrente() { return state.pianoIdSettimanaCorrente; }

export function setSettimanaPrecedentePopolata(s) { state.settimanaPrecedentePopolata = s; }
export function getSettimanaPrecedentePopolata() { return state.settimanaPrecedentePopolata; }

export function setStrutturaPianoCorrente(s) { state.strutturaPianoCorrente = s; }
export function getStrutturaPianoCorrente() { return state.strutturaPianoCorrente; }

export function setStatoMancanti(s) { state.statoMancanti = s; }
export function getStatoMancanti() { return state.statoMancanti; }

export function setDecisioneMancante(statoId, decisione) { state.decisioniMancanti.set(statoId, decisione); }
export function getDecisioneMancante(statoId) { return state.decisioniMancanti.get(statoId); }
export function getDecisioniMancanti() { return state.decisioniMancanti; }
export function resetDecisioniMancanti() { state.decisioniMancanti = new Map(); }

export function setSottoVista(v) { state.sottoVista = v; }
export function getSottoVista() { return state.sottoVista; }

export function setTemplateInCostruzioneId(id) { state.templateInCostruzioneId = id; }
export function getTemplateInCostruzioneId() { return state.templateInCostruzioneId; }

export function setStrutturaTemplateInCostruzione(s) { state.strutturaTemplateInCostruzione = s; }
export function getStrutturaTemplateInCostruzione() { return state.strutturaTemplateInCostruzione; }
