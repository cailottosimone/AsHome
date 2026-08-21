// js/mealplan-state.js
// Stato in memoria del Piano Alimentare: dispensa, piani, template,
// checklist "Cosa mi manca". Segue lo stesso pattern di state.js
// (specchio locale per il rendering, la fonte di verità resta Supabase).

const state = {
  categorie: [],
  alimenti: [],
  tipiPasto: [],
  piani: [],
  templates: [],

  pianoCorrenteId: null,
  strutturaPianoCorrente: [], // giorni → pasti → alimenti, da fetchPianoCompleto()

  statoMancanti: [], // checklist del piano corrente

  sottoVista: "piano", // "piano" | "dispensa" | "mancanti" | "impostazioni"

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

export function setPiani(p) { state.piani = p; }
export function getPiani() { return state.piani; }

export function setTemplates(t) { state.templates = t; }
export function getTemplates() { return state.templates; }

export function setPianoCorrenteId(id) { state.pianoCorrenteId = id; }
export function getPianoCorrenteId() { return state.pianoCorrenteId; }

export function setStrutturaPianoCorrente(s) { state.strutturaPianoCorrente = s; }
export function getStrutturaPianoCorrente() { return state.strutturaPianoCorrente; }

export function setStatoMancanti(s) { state.statoMancanti = s; }
export function getStatoMancanti() { return state.statoMancanti; }

export function setSottoVista(v) { state.sottoVista = v; }
export function getSottoVista() { return state.sottoVista; }

export function setTemplateInCostruzioneId(id) { state.templateInCostruzioneId = id; }
export function getTemplateInCostruzioneId() { return state.templateInCostruzioneId; }

export function setStrutturaTemplateInCostruzione(s) { state.strutturaTemplateInCostruzione = s; }
export function getStrutturaTemplateInCostruzione() { return state.strutturaTemplateInCostruzione; }
