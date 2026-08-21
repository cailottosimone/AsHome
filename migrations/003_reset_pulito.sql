-- migrations/003_reset_pulito.sql
-- Reset esplicito e concordato: passando al modello multi-Casa, i dati
-- attuali di lista_spesa e suggerimenti_ignorati non vengono migrati
-- (nessuna Casa a cui assegnarli retroattivamente in modo sensato).
-- Si riparte puliti, come deciso.
--
-- Eseguire questa migrazione SOLO se sei d'accordo a perdere i dati
-- attuali della lista/storico. È irreversibile.

truncate table "AsHome".lista_spesa;
truncate table "AsHome".suggerimenti_ignorati;
