-- migrations/012_settimane.sql
-- Cambio di modello concordato: il "piano" con nome libero, da scegliere
-- da un elenco, viene sostituito dal concetto di SETTIMANA, identificata
-- dalla sua data di inizio (lunedì). Non si crea più un piano a parte:
-- si naviga di settimana in settimana con un calendario (frecce
-- prev/next), e si compila quella che si sta guardando — da zero, da un
-- template, o copiando l'ultima settimana popolata. Non esiste più
-- "piano vuoto" come azione distinta: ogni settimana è già lì, pronta
-- da riempire nel momento in cui la tocchi.
--
-- Reset esplicito e concordato: i piani esistenti (nome libero, nessuna
-- data) non si adattano al nuovo modello — si riparte puliti, stesso
-- approccio già seguito per il passaggio al modello a Case (migrations/003).
-- CASCADE: ripulisce anche tutto ciò che dipende da un piano (giorni,
-- pasti, sezioni-categoria, alimenti previsti, checklist).

truncate table "AsHome".piani cascade;

alter table "AsHome".piani drop column nome;
alter table "AsHome".piani add column data_inizio date not null;

-- Una sola riga per Casa per ogni settimana (identificata dal lunedì
-- di quella settimana, calcolato lato applicazione).
alter table "AsHome".piani add constraint piani_casa_settimana_unica unique (casa_id, data_inizio);
