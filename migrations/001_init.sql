-- migrations/001_init.sql
-- Schema iniziale di AsHome: tabella lista_spesa.
-- (Corrisponde al contenuto che prima viveva in schema.sql da solo.)

create schema if not exists "AsHome";

create table if not exists "AsHome".lista_spesa (
  id uuid primary key default gen_random_uuid(),
  prodotto text not null,
  quantita text,
  categoria text default 'Altro',
  negozio text default 'Generale',
  note text,
  acquistato boolean not null default false,
  archiviato boolean not null default false,
  data_archiviazione timestamptz,
  created_at timestamptz not null default now()
);

-- Row Level Security: l'app usa la anon/publishable key, quindi la
-- sicurezza reale va gestita qui, non nascondendo la chiave.
-- Questa policy permette tutto a chiunque abbia la anon key: va bene
-- per un uso familiare/privato con link non condiviso pubblicamente,
-- ma restringila se l'app dovesse mai diventare multi-utente.
alter table "AsHome".lista_spesa enable row level security;

create policy "Consenti tutto con anon key"
  on "AsHome".lista_spesa
  for all
  using (true)
  with check (true);

-- Serve per ricevere gli aggiornamenti realtime (sync multi-dispositivo).
alter publication supabase_realtime add table "AsHome".lista_spesa;
