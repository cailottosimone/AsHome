-- migrations/002_suggerimenti.sql
-- Aggiunge il supporto per "Non ora" / "Non suggerire più" sui
-- suggerimenti della sezione "Potresti aver bisogno di".
--
-- Puramente additiva: non tocca la tabella lista_spesa esistente,
-- nessun dato storico viene modificato o cancellato.
--
-- I suggerimenti stessi NON sono persistiti: si ricalcolano al volo
-- dallo storico (vedi js/suggestions.js). Questa tabella memorizza solo
-- le eccezioni esplicite dell'utente (cosa NON vuole vedersi suggerito).

create table if not exists "AsHome".suggerimenti_ignorati (
  id uuid primary key default gen_random_uuid(),
  prodotto_normalizzato text not null,
  tipo text not null check (tipo in ('temporaneo', 'permanente')),
  snooze_fino timestamptz, -- null per i dismiss permanenti
  created_at timestamptz not null default now()
);

alter table "AsHome".suggerimenti_ignorati enable row level security;

create policy "Consenti tutto con anon key"
  on "AsHome".suggerimenti_ignorati
  for all
  using (true)
  with check (true);

alter publication supabase_realtime add table "AsHome".suggerimenti_ignorati;
