-- migrations/013_supermercati.sql
-- Supermercati definibili da Impostazioni: a differenza delle categorie
-- alimento (condivise globalmente tra tutte le Case, una tassonomia
-- concettuale), i supermercati sono specifici per Casa — "Esselunga" o
-- "Conad" dipendono da dove abiti, non un concetto universale.
--
-- Non sostituiscono il campo libero "negozio" già in lista_spesa (resta
-- testo libero, per non perdere la flessibilità di poter scrivere anche
-- un negozio non in elenco): lo alimentano come suggerimenti (datalist),
-- non lo vincolano.

create table "AsHome".supermercati (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (casa_id, nome)
);

alter table "AsHome".supermercati enable row level security;
create policy "Solo membri della casa"
  on "AsHome".supermercati for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

alter publication supabase_realtime add table "AsHome".supermercati;
