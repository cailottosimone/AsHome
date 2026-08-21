// js/onboarding-ui.js
// DOM per login, onboarding Casa e il piccolo menu account nell'header.
// Nessuna chiamata di rete qui, come in ui.js.

export const els = {
  viewLogin: document.getElementById("viewLogin"),

  tabLoginMagicLink: document.getElementById("tabLoginMagicLink"),
  tabLoginPassword: document.getElementById("tabLoginPassword"),
  blocoMagicLink: document.getElementById("blocoMagicLink"),
  blocoPassword: document.getElementById("blocoPassword"),

  formLogin: document.getElementById("formLogin"),
  inputEmailLogin: document.getElementById("inputEmailLogin"),
  btnInviaLink: document.getElementById("btnInviaLink"),
  msgLoginInviato: document.getElementById("msgLoginInviato"),
  msgLoginErrore: document.getElementById("msgLoginErrore"),

  formPassword: document.getElementById("formPassword"),
  inputEmailPassword: document.getElementById("inputEmailPassword"),
  inputPassword: document.getElementById("inputPassword"),
  inputPasswordConferma: document.getElementById("inputPasswordConferma"),
  btnSubmitPassword: document.getElementById("btnSubmitPassword"),
  passwordModeLabel: document.getElementById("passwordModeLabel"),
  btnToggleModalitaPassword: document.getElementById("btnToggleModalitaPassword"),
  msgPasswordInfo: document.getElementById("msgPasswordInfo"),

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

/** tab: "magic-link" | "password" — le due modalità di accesso, alternative tra loro. */
export function mostraTabLogin(tab) {
  const magicLink = tab === "magic-link";
  els.blocoMagicLink.classList.toggle("hidden", !magicLink);
  els.blocoPassword.classList.toggle("hidden", magicLink);

  for (const [tabEl, attivo] of [[els.tabLoginMagicLink, magicLink], [els.tabLoginPassword, !magicLink]]) {
    tabEl.classList.toggle("bg-white", attivo);
    tabEl.classList.toggle("shadow-sm", attivo);
    tabEl.classList.toggle("text-slate-800", attivo);
    tabEl.classList.toggle("text-slate-500", !attivo);
  }

  els.msgLoginErrore.classList.add("hidden");
  els.msgPasswordInfo.classList.add("hidden");
}

/** modalita: "accedi" | "registrati" — solo nel blocco email+password. */
export function mostraModalitaPassword(modalita) {
  const registrati = modalita === "registrati";
  els.inputPasswordConferma.classList.toggle("hidden", !registrati);
  els.inputPasswordConferma.required = registrati;
  els.passwordModeLabel.textContent = registrati
    ? "Crea un account con la tua email e una password."
    : "Accedi con la tua email e la tua password.";
  els.btnSubmitPassword.textContent = registrati ? "Registrati" : "Accedi";
  els.btnToggleModalitaPassword.textContent = registrati ? "Hai già un account? Accedi" : "Non hai un account? Registrati";
  els.msgPasswordInfo.classList.add("hidden");
  els.msgLoginErrore.classList.add("hidden");
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

/** Messaggio informativo nel blocco password (es. "controlla la tua email per confermare"). */
export function mostraInfoPassword(messaggio) {
  els.msgPasswordInfo.textContent = messaggio;
  els.msgPasswordInfo.classList.remove("hidden");
  els.msgLoginErrore.classList.add("hidden");
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
