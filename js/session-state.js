// js/session-state.js
// Stato di sessione in memoria: chi è loggato e in quale Casa si trova.
// Condiviso da tutta l'app (lista spesa + piano alimentare), a differenza
// di state.js (solo lista spesa) e mealplan-state.js (solo piano).

const session = {
  user: null, // { id, email } oppure null
  casa: null, // { id, nome, codiceInvito } oppure null
};

export function setUser(user) {
  session.user = user;
}

export function getUser() {
  return session.user;
}

export function getUserId() {
  return session.user?.id ?? null;
}

export function setCasa(casa) {
  session.casa = casa;
}

export function getCasa() {
  return session.casa;
}

export function getCasaId() {
  return session.casa?.id ?? null;
}

export function reset() {
  session.user = null;
  session.casa = null;
}
