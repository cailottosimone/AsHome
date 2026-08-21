// js/onboarding-ui.js
// DOM per login, onboarding Casa e il piccolo menu account nell'header.
// Nessuna chiamata di rete qui, come in ui.js.

export const els = {
  viewLogin: document.getElementById("viewLogin"),
  formLogin: document.getElementById("formLogin"),
  inputEmailLogin: document.getElementById("inputEmailLogin"),
  btnInviaLink: document.getElementById("btnInviaLink"),
  msgLoginInviato: document.getElementById("msgLoginInviato"),
  msgLoginErrore: document.getElementById("msgLoginErrore"),

  viewOnboardingCasa: document.getElementById("viewOnboardingCasa"),
  formCreaCasa: document.getElementById("formCreaCasa"),
  inputNomeCasa: document.getElementById("inputNomeCasa"),
  formUnisciteCasa: document.getElementById("formUnisciteCasa"),
  inputCodiceCasa: document.getElementById("inputCodiceCasa"),
  msgOnboardingErrore: document.getElementById("msgOnboardingErrore"),

  viewApp: document.getElementById("viewApp"),

  menuAccount: document.getElementById("menuAccount"),
  accountEmail: document.getElementById("accountEmail"),
  accountCasaNome: document.getElementById("accountCasaNome"),
  accountCodiceInvito: document.getElementById("accountCodiceInvito"),
};

/** schermata: "login" | "onboarding" | "app" */
export function mostraSchermata(schermata) {
  els.viewLogin.classList.toggle("hidden", schermata !== "login");
  els.viewOnboardingCasa.classList.toggle("hidden", schermata !== "onboarding");
  els.viewApp.classList.toggle("hidden", schermata !== "app");
}

export function mostraLinkInviato(email) {
  els.msgLoginInviato.textContent = `Ti abbiamo mandato un link di accesso a ${email}. Aprilo per continuare.`;
  els.msgLoginInviato.classList.remove("hidden");
  els.msgLoginErrore.classList.add("hidden");
}

export function mostraErroreLogin(messaggio) {
  els.msgLoginErrore.textContent = messaggio;
  els.msgLoginErrore.classList.remove("hidden");
}

export function mostraErroreOnboarding(messaggio) {
  els.msgOnboardingErrore.textContent = messaggio;
  els.msgOnboardingErrore.classList.remove("hidden");
}

export function nascondiErroreOnboarding() {
  els.msgOnboardingErrore.classList.add("hidden");
}

export function aggiornaAccount(user, casa) {
  els.accountEmail.textContent = user?.email ?? "";
  els.accountCasaNome.textContent = casa?.nome ?? "";
  els.accountCodiceInvito.textContent = casa?.codiceInvito ?? "";
}

export function toggleMenuAccount() {
  els.menuAccount.classList.toggle("hidden");
}

export function chiudiMenuAccount() {
  els.menuAccount.classList.add("hidden");
}
