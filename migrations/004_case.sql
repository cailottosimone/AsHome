-- migrations/004_case.sql
-- "Casa": il contenitore che raggruppa lista spesa, dispensa, piano
-- alimentare e storico di un gruppo di persone che condividono la spesa.
--
-- Nome tecnico della tabella: abitazioni. "CASE" è una parola riservata
-- in SQL (il costrutto CASE WHEN...END): per evitare ogni rischio di
-- errori di sintassi in query scritte a mano, il nome tecnico resta
-- "abitazioni", ma nel codice applicativo e nell'interfaccia si parla
-- SEMPRE e SOLO di "Casa"/"Case" (file js/casa*.js, variabili casaId,
-- casaCorrente, testi UI...). Le due cose sono scelte indipendenti.

create table "AsHome".abitazioni (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codice_invito text not null unique,
  created_at timestamptz not null default now()
);

create table "AsHome".membri_casa (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (casa_id, user_id)
);

alter table "AsHome".abitazioni enable row level security;
alter table "AsHome".membri_casa enable row level security;

-- ── Funzione helper per tutte le RLS del progetto ──
--
-- SECURITY DEFINER: gira con i privilegi di chi l'ha creata, quindi
-- "vede" membri_casa anche se la RLS di membri_casa normalmente
-- bloccherebbe l'accesso. Serve per due motivi:
--  1) evitare la ricorsione infinita che si otterrebbe se la policy di
--     SELECT su membri_casa dovesse interrogare membri_casa stessa;
--  2) dare a TUTTE le tabelle "di Casa" (questa e quelle delle prossime
--     migrazioni) un unico punto/una unica regola per "sei membro di
--     questa Casa?", invece di ripetere la logica in ogni policy.
create or replace function "AsHome".is_membro_casa(p_casa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = "AsHome"
as $$
  select exists (
    select 1 from "AsHome".membri_casa
    where casa_id = p_casa_id and user_id = auth.uid()
  );
$$;

-- ── Policy: abitazioni ──

create policy "Vedi solo le tue case"
  on "AsHome".abitazioni
  for select
  using ("AsHome".is_membro_casa(id));

create policy "Chiunque autenticato può creare una casa"
  on "AsHome".abitazioni
  for insert
  with check (auth.uid() is not null);

-- ── Policy: membri_casa ──

create policy "Vedi i membri delle tue case"
  on "AsHome".membri_casa
  for select
  using ("AsHome".is_membro_casa(casa_id));

-- Nota di sicurezza: questa policy permette a chiunque sia autenticato
-- di aggiungersi come membro di QUALSIASI casa_id, purché lo faccia per
-- se stesso (user_id = auth.uid()). Chi non conosce il codice invito non
-- può comunque scoprire l'id di una casa altrui (la SELECT su abitazioni
-- è già ristretta ai soli membri, e trova_casa_da_codice() restituisce
-- solo l'id corrispondente a un codice che l'utente già possiede) — ma
-- un id UUID indovinato "a caso" (praticamente impossibile) baypasserebbe
-- il controllo del codice. Rischio accettato per semplicità in un'app
-- familiare privata; se in futuro servisse più rigore, si sostituisce
-- questa policy con un insert bloccato e una funzione RPC dedicata che
-- rivalida il codice invito al momento dell'adesione.
create policy "Puoi aggiungerti come membro di una casa"
  on "AsHome".membri_casa
  for insert
  with check (user_id = auth.uid());

-- ── Funzione per "Unisciti con codice" ──
--
-- Prima di essere membro di una Casa non potresti nemmeno vederla (la
-- SELECT su abitazioni è ristretta ai membri): questa funzione, con gli
-- stessi privilegi elevati di is_membro_casa(), permette di cercare
-- l'id di una Casa a partire dal codice invito, indipendentemente
-- dall'appartenenza. Il client la chiama, ottiene l'id, e con quello fa
-- l'INSERT in membri_casa per unirsi.
create or replace function "AsHome".trova_casa_da_codice(p_codice text)
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = "AsHome"
as $$
  select id, nome from "AsHome".abitazioni where codice_invito = p_codice;
$$;

alter publication supabase_realtime add table "AsHome".abitazioni;
alter publication supabase_realtime add table "AsHome".membri_casa;
