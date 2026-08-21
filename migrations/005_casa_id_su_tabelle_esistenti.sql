-- migrations/005_casa_id_su_tabelle_esistenti.sql
-- lista_spesa e suggerimenti_ignorati diventano tabelle "di Casa": ogni
-- riga appartiene a una Casa specifica. Le tabelle sono state svuotate
-- nella migrazione precedente (003_reset_pulito.sql), quindi la colonna
-- può essere NOT NULL fin da subito, senza bisogno di backfill.

alter table "AsHome".lista_spesa
  add column casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade;

alter table "AsHome".suggerimenti_ignorati
  add column casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade;

-- Sostituisce le vecchie policy "chiunque con anon key" con l'accesso
-- ristretto ai soli membri della Casa proprietaria della riga.
drop policy "Consenti tutto con anon key" on "AsHome".lista_spesa;
create policy "Solo membri della casa"
  on "AsHome".lista_spesa
  for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

drop policy "Consenti tutto con anon key" on "AsHome".suggerimenti_ignorati;
create policy "Solo membri della casa"
  on "AsHome".suggerimenti_ignorati
  for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));
