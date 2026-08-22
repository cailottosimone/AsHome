// js/main.js
// Punto di ingresso reale della pagina (è l'unico script type="module"
// caricato da index.html). Decide quale schermata mostrare — login,
// onboarding Casa, o l'app vera e propria — avvia app.js e
// mealplan-app.js una sola volta, e gestisce il passaggio tra le due
// app pari (Lista Spesa / Piano Alimentare) e gli elementi condivisi
// tra loro (menu account, versione).

import * as authApi from "./auth-api.js";
import * as casaApi from "./casa-api.js";
import * as sessionState from "./session-state.js";
import * as onboardingUi from "./onboarding-ui.js";
import * as listaSpesaApp from "./app.js";
import * as mealplanApp from "./mealplan-app.js";
import * as settingsApp from "./settings-app.js";
import { APP_VERSION } from "./config.js";

let appInizializzata = false;
let appAttiva = "lista-spesa"; // "lista-spesa" | "piano-alimentare" | "impostazioni"
let modalitaPassword = "accedi"; // "accedi" | "registrati", solo nel blocco email+password

const subViewListaSpesa = document.getElementById("subViewListaSpesa");
const subViewPianoAlimentare = document.getElementById("subViewPianoAlimentare");
const subViewImpostazioni = document.getElementById("subViewImpostazioni");
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
// Due gruppi distinti, con stili di evidenziazione diversi: le tab
// inline della barra desktop (sottolineatura) e le voci del drawer
// mobile (sfondo pieno). L'icona Impostazioni usa lo stesso
// data-action (così il click la gestisce comunque) ma non fa parte di
// nessuno dei due gruppi — resta statica, concettualmente separata
// dalle due app pari.
const tabButtonsDesktop = document.querySelectorAll('[data-nav="desktop"]');
const tabButtonsMobile = document.querySelectorAll('[data-nav="mobile"]');

function apriSidebar() {
  sidebar.classList.remove("-translate-x-full");
  sidebarBackdrop.classList.remove("hidden");
}

function chiudiSidebar() {
  sidebar.classList.add("-translate-x-full");
  sidebarBackdrop.classList.add("hidden");
}

/** Le tre app sono pari: questa funzione passa dall'una all'altra, non
 *  "apre"/"chiude" nulla in senso gerarchico. */
function mostraApp(nomeApp) {
  appAttiva = nomeApp;
  subViewListaSpesa.classList.toggle("hidden", nomeApp !== "lista-spesa");
  subViewPianoAlimentare.classList.toggle("hidden", nomeApp !== "piano-alimentare");
  subViewImpostazioni.classList.toggle("hidden", nomeApp !== "impostazioni");
  chiudiSidebar(); // su mobile, scegliere una destinazione richiude il drawer

  tabButtonsDesktop.forEach((btn) => {
    const attivo = btn.dataset.app === nomeApp;
    btn.classList.toggle("text-indigo-400", attivo);
    btn.classList.toggle("border-indigo-400", attivo);
    btn.classList.toggle("text-slate-400", !attivo);
    btn.classList.toggle("border-transparent", !attivo);
  });

  tabButtonsMobile.forEach((btn) => {
    const attivo = btn.dataset.app === nomeApp;
    btn.classList.toggle("text-indigo-400", attivo);
    btn.classList.toggle("bg-slate-800/80", attivo);
    btn.classList.toggle("text-slate-400", !attivo);
  });
}

function mostraVersione() {
  document.querySelectorAll(".app-version-badge").forEach((el) => { el.textContent = `v${APP_VERSION}`; });
}

/** Dato un utente già impostato in sessionState, decide onboarding vs app. */
async function risolviVista() {
  const user = sessionState.getUser();
  if (!user) {
    onboardingUi.mostraSchermata("login");
    return;
  }

  let mieCase;
  try {
    mieCase = await casaApi.fetchMieCase();
  } catch (err) {
    console.error("Errore nel recupero della Casa:", err);
    onboardingUi.mostraErroreOnboarding("Errore nel caricamento. Riprova tra poco.");
    onboardingUi.mostraSchermata("onboarding");
    return;
  }

  if (mieCase.length === 0) {
    onboardingUi.mostraSchermata("onboarding");
    return;
  }

  // Semplificazione della v1: se l'utente appartenesse a più Case si usa
  // la prima. Un selettore multi-Casa è un possibile sviluppo futuro,
  // non richiesto ora.
  const casa = mieCase[0];
  sessionState.setCasa({ id: casa.id, nome: casa.nome, codiceInvito: casa.codice_invito });
  onboardingUi.aggiornaAccount(user, sessionState.getCasa());
  onboardingUi.mostraSchermata("app");
  mostraApp(appAttiva);
  mostraVersione();

  if (!appInizializzata) {
    appInizializzata = true;
    await listaSpesaApp.init(casa.id);
    await mealplanApp.init(casa.id);
    await settingsApp.init(casa.id);
  }
}

function handleAuthChange(session) {
  if (!session) {
    sessionState.reset();
    onboardingUi.mostraSchermata("login");
    return;
  }
  sessionState.setUser({ id: session.user.id, email: session.user.email });
  risolviVista();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = onboardingUi.els.inputEmailLogin.value.trim();
  if (!email) return;

  onboardingUi.els.btnInviaLink.disabled = true;
  try {
    await authApi.inviaMagicLink(email);
    onboardingUi.mostraLinkInviato(email);
  } catch (err) {
    onboardingUi.mostraErroreLogin("Errore nell'invio del link: " + err.message);
  } finally {
    onboardingUi.els.btnInviaLink.disabled = false;
  }
}

async function handleFormPasswordSubmit(event) {
  event.preventDefault();
  const email = onboardingUi.els.inputEmailPassword.value.trim();
  const password = onboardingUi.els.inputPassword.value;
  if (!email || !password) return;

  if (modalitaPassword === "registrati") {
    const conferma = onboardingUi.els.inputPasswordConferma.value;
    if (password !== conferma) {
      onboardingUi.mostraErroreLogin("Le due password non coincidono.");
      return;
    }
  }

  onboardingUi.els.btnSubmitPassword.disabled = true;
  try {
    if (modalitaPassword === "registrati") {
      const { emailGiaConfermata } = await authApi.registratiConPassword(email, password);
      if (!emailGiaConfermata) {
        onboardingUi.mostraInfoPassword(`Account creato. Controlla ${email} e clicca il link di conferma prima di accedere.`);
      }
      // Se emailGiaConfermata è vera, Supabase ha già aperto una sessione:
      // handleAuthChange (sotto) se ne accorge da solo, nessuna azione da fare qui.
    } else {
      await authApi.accediConPassword(email, password);
    }
  } catch (err) {
    onboardingUi.mostraErroreLogin("Errore: " + err.message);
  } finally {
    onboardingUi.els.btnSubmitPassword.disabled = false;
  }
}

async function handleCreaCasaSubmit(event) {
  event.preventDefault();
  const nome = onboardingUi.els.inputNomeCasa.value.trim();
  if (!nome) return;
  onboardingUi.nascondiErroreOnboarding();

  try {
    await casaApi.creaCasa(nome, sessionState.getUserId());
    await risolviVista();
  } catch (err) {
    onboardingUi.mostraErroreOnboarding("Errore nella creazione della Casa: " + err.message);
  }
}

async function handleUnisciteCasaSubmit(event) {
  event.preventDefault();
  const codice = onboardingUi.els.inputCodiceCasa.value.trim().toUpperCase();
  if (!codice) return;
  onboardingUi.nascondiErroreOnboarding();

  try {
    await casaApi.unisciteACasa(codice, sessionState.getUserId());
    await risolviVista();
  } catch (err) {
    onboardingUi.mostraErroreOnboarding("Codice non valido, o errore nell'adesione: " + err.message);
  }
}

async function handleLogout() {
  await authApi.logout();
  // Il modo più semplice e robusto per azzerare tutto lo stato in
  // memoria di entrambe le app (lista spesa + piano alimentare).
  window.location.reload();
}

function bindEventi() {
  onboardingUi.els.formLogin.addEventListener("submit", handleLoginSubmit);
  onboardingUi.els.formPassword.addEventListener("submit", handleFormPasswordSubmit);
  onboardingUi.els.formCreaCasa.addEventListener("submit", handleCreaCasaSubmit);
  onboardingUi.els.formUnisciteCasa.addEventListener("submit", handleUnisciteCasaSubmit);

  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");

    if (target?.dataset.action === "mostra-tab-login") {
      onboardingUi.mostraTabLogin(target.dataset.tab);
      return;
    }
    if (target?.dataset.action === "toggle-modalita-password") {
      modalitaPassword = modalitaPassword === "accedi" ? "registrati" : "accedi";
      onboardingUi.mostraModalitaPassword(modalitaPassword);
      return;
    }
    if (target?.dataset.action === "vai-a-app") {
      mostraApp(target.dataset.app);
      return;
    }
    if (target?.dataset.action === "apri-sidebar") {
      apriSidebar();
      return;
    }
    if (target?.dataset.action === "chiudi-sidebar") {
      chiudiSidebar();
      return;
    }
    if (target?.dataset.action === "toggle-account-menu") {
      onboardingUi.toggleMenuAccount();
      return;
    }
    if (target?.dataset.action === "logout") {
      handleLogout();
      return;
    }
    // Click fuori dal menu account: lo chiude.
    if (!event.target.closest("#menuAccount") && !event.target.closest('[data-action="toggle-account-menu"]')) {
      onboardingUi.chiudiMenuAccount();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEventi();
  // onAuthStateChange invoca subito il callback anche con lo stato
  // corrente (sessione già presente da una visita precedente, oppure
  // nessuna sessione): non serve un controllo separato all'avvio.
  authApi.onAuthChange(handleAuthChange);
});
