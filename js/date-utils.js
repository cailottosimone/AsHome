// js/date-utils.js
// Funzioni pure per lavorare con le settimane (lunedì-domenica) del
// Piano Alimentare. Nessuna dipendenza da stato o rete.

/** Data (YYYY-MM-DD) del lunedì della settimana che contiene `data`. */
export function lunediDellaSettimana(data) {
  const d = new Date(data);
  const giorno = d.getDay(); // 0=domenica..6=sabato
  const distanzaDaLunedi = giorno === 0 ? 6 : giorno - 1;
  d.setDate(d.getDate() - distanzaDaLunedi);
  return formattaISO(d);
}

export function formattaISO(data) {
  const d = new Date(data);
  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, "0");
  const giorno = String(d.getDate()).padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

export function aggiungiGiorni(dataISO, giorni) {
  const d = new Date(dataISO + "T00:00:00");
  d.setDate(d.getDate() + giorni);
  return formattaISO(d);
}

export function aggiungiSettimane(dataISO, settimane) {
  return aggiungiGiorni(dataISO, settimane * 7);
}

const MESI_ESTESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const MESI_BREVI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const GIORNI_BREVI = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

/** "LUN 18" — il giorno breve + il numero del giorno nel mese, per il giorno
 *  a offset `giorno` (0=lunedì..6=domenica) dentro la settimana che
 *  inizia a `dataInizioISO`. */
export function etichettaGiorno(dataInizioISO, giorno) {
  const dataGiorno = aggiungiGiorni(dataInizioISO, giorno);
  const d = new Date(dataGiorno + "T00:00:00");
  return `${GIORNI_BREVI[giorno]} ${d.getDate()}`;
}

/** "18 – 24 Agosto 2026", oppure con mesi/anni abbreviati se la settimana li attraversa. */
export function formattaRangeSettimana(lunediISO) {
  const domenicaISO = aggiungiGiorni(lunediISO, 6);
  const lun = new Date(lunediISO + "T00:00:00");
  const dom = new Date(domenicaISO + "T00:00:00");

  if (lun.getMonth() === dom.getMonth() && lun.getFullYear() === dom.getFullYear()) {
    return `${lun.getDate()} – ${dom.getDate()} ${MESI_ESTESI[lun.getMonth()]} ${lun.getFullYear()}`;
  }
  if (lun.getFullYear() === dom.getFullYear()) {
    return `${lun.getDate()} ${MESI_BREVI[lun.getMonth()]} – ${dom.getDate()} ${MESI_BREVI[dom.getMonth()]} ${lun.getFullYear()}`;
  }
  return `${lun.getDate()} ${MESI_BREVI[lun.getMonth()]} ${lun.getFullYear()} – ${dom.getDate()} ${MESI_BREVI[dom.getMonth()]} ${dom.getFullYear()}`;
}
