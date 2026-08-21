-- schema.sql
-- Schema Postgres/Supabase COMPLETO di AsHome, per un setup da zero
-- su un progetto nuovo. Se stai invece aggiornando un'installazione
-- che ha già una versione precedente, esegui solo le migrazioni che ti
-- mancano dalla cartella migrations/: sono numerate e additive.
--
-- Storico delle modifiche allo schema: cartella migrations/, in ordine.

-- ══════════════════════════════════════════════════════════
-- 001_init.sql
-- ══════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════
-- 002_suggerimenti.sql
-- ══════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════
-- 003_reset_pulito.sql
-- ══════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════
-- 004_case.sql
-- ══════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════
-- 005_casa_id_su_tabelle_esistenti.sql
-- ══════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════
-- 006_dispensa.sql
-- ══════════════════════════════════════════════════════════
-- migrations/006_dispensa.sql
-- Categorie alimento: condivise globalmente tra tutte le Case (come deciso),
-- non un dato privato — è una tassonomia concettuale (Carboidrati, Verdura...).
-- Chiunque sia autenticato le legge e può estenderle.

create table "AsHome".categorie_alimento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table "AsHome".categorie_alimento enable row level security;

create policy "Chiunque autenticato legge le categorie"
  on "AsHome".categorie_alimento for select
  using (auth.uid() is not null);

create policy "Chiunque autenticato può aggiungere una categoria"
  on "AsHome".categorie_alimento for insert
  with check (auth.uid() is not null);

insert into "AsHome".categorie_alimento (nome) values
  ('Carboidrati'), ('Verdura'), ('Frutta'), ('Carne bianca'),
  ('Carne rossa'), ('Pesce'), ('Latticini')
on conflict (nome) do nothing;

-- "Dispensa": cosa la Casa mangia/usa normalmente — non un inventario di
-- cosa c'è fisicamente in casa in questo momento.

create table "AsHome".alimenti (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

alter table "AsHome".alimenti enable row level security;
create policy "Solo membri della casa"
  on "AsHome".alimenti for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

-- Un alimento può stare in più categorie (punto 3 della richiesta).
create table "AsHome".alimenti_categorie (
  id uuid primary key default gen_random_uuid(),
  alimento_id uuid not null references "AsHome".alimenti(id) on delete cascade,
  categoria_id uuid not null references "AsHome".categorie_alimento(id) on delete cascade,
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade, -- denormalizzato da alimenti, per RLS semplici
  unique (alimento_id, categoria_id)
);

alter table "AsHome".alimenti_categorie enable row level security;
create policy "Solo membri della casa"
  on "AsHome".alimenti_categorie for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

alter publication supabase_realtime add table "AsHome".alimenti;
alter publication supabase_realtime add table "AsHome".alimenti_categorie;

-- ══════════════════════════════════════════════════════════
-- 007_piani.sql
-- ══════════════════════════════════════════════════════════
-- migrations/007_piani.sql
-- Piano → giorni → pasti → alimenti previsti (punto 2 e 4 della richiesta).
--
-- casa_id è ripetuto (denormalizzato) su ogni tabella, anche quando è
-- ricavabile risalendo le foreign key (es. piano_pasti → piano_giorni →
-- piani). Scelta deliberata: mantiene tutte le policy RLS allo stesso,
-- semplice schema "is_membro_casa(casa_id)" invece di richiedere una
-- catena di JOIN in ogni policy — più facile da leggere, verificare e
-- mantenere corretta nel tempo. Il valore è impostato una sola volta
-- alla creazione della riga e non cambia mai.

-- tipi_pasto è una lookup table, non un enum/check-list: aggiungere
-- "Colazione" o "Merenda" in futuro è un semplice insert, non richiede
-- nessuna migrazione sullo schema (punto 2: "flessibile in futuro").
create table "AsHome".tipi_pasto (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordine int not null default 0
);

alter table "AsHome".tipi_pasto enable row level security;
create policy "Chiunque autenticato legge i tipi pasto"
  on "AsHome".tipi_pasto for select using (auth.uid() is not null);
-- Nessuna policy di insert/update/delete dall'app: i tipi pasto si
-- gestiscono manualmente (SQL Editor) quando servirà aggiungerne uno.

insert into "AsHome".tipi_pasto (nome, ordine) values
  ('Pranzo', 1), ('Cena', 2)
on conflict (nome) do nothing;

create table "AsHome".piani (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

alter table "AsHome".piani enable row level security;
create policy "Solo membri della casa"
  on "AsHome".piani for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

create table "AsHome".piano_giorni (
  id uuid primary key default gen_random_uuid(),
  piano_id uuid not null references "AsHome".piani(id) on delete cascade,
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  giorno_settimana smallint not null check (giorno_settimana between 0 and 6), -- 0=lunedì ... 6=domenica
  unique (piano_id, giorno_settimana)
);

alter table "AsHome".piano_giorni enable row level security;
create policy "Solo membri della casa"
  on "AsHome".piano_giorni for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

create table "AsHome".piano_pasti (
  id uuid primary key default gen_random_uuid(),
  piano_giorno_id uuid not null references "AsHome".piano_giorni(id) on delete cascade,
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  tipo_pasto_id uuid not null references "AsHome".tipi_pasto(id),
  unique (piano_giorno_id, tipo_pasto_id)
);

alter table "AsHome".piano_pasti enable row level security;
create policy "Solo membri della casa"
  on "AsHome".piano_pasti for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

-- La relazione chiave del punto 4: "questo pasto richiede questi alimenti".
create table "AsHome".piano_pasto_alimenti (
  id uuid primary key default gen_random_uuid(),
  piano_pasto_id uuid not null references "AsHome".piano_pasti(id) on delete cascade,
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  alimento_id uuid not null references "AsHome".alimenti(id) on delete cascade,
  unique (piano_pasto_id, alimento_id)
);

alter table "AsHome".piano_pasto_alimenti enable row level security;
create policy "Solo membri della casa"
  on "AsHome".piano_pasto_alimenti for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

alter publication supabase_realtime add table "AsHome".piani;
alter publication supabase_realtime add table "AsHome".piano_giorni;
alter publication supabase_realtime add table "AsHome".piano_pasti;
alter publication supabase_realtime add table "AsHome".piano_pasto_alimenti;

-- ══════════════════════════════════════════════════════════
-- 008_template.sql
-- ══════════════════════════════════════════════════════════
-- migrations/008_template.sql
-- Template di settimana: definisce le CATEGORIE attese per pasto
-- (es. Lunedì pranzo: Carboidrati + Verdura), non alimenti specifici
-- (punto 5 della richiesta).
--
-- casa_id nullable = template di SISTEMA, visibile e utilizzabile da
-- tutte le Case in sola lettura. casa_id valorizzato = template privato
-- di quella Casa. Nessun template di sistema viene precompilato in
-- questa migrazione: le categorie per giorno/pasto sono una scelta di
-- contenuto (cosa mettere "Lunedì pranzo") che spetta a voi, non a me
-- da inventare — la struttura è pronta per quando deciderete cosa farci.

create table "AsHome".template_piani (
  id uuid primary key default gen_random_uuid(),
  casa_id uuid references "AsHome".abitazioni(id) on delete cascade, -- null = template di sistema
  nome text not null,
  created_at timestamptz not null default now()
);

alter table "AsHome".template_piani enable row level security;

create policy "Leggi i template di sistema o quelli della tua casa"
  on "AsHome".template_piani for select
  using (casa_id is null or "AsHome".is_membro_casa(casa_id));

create policy "Crea template solo per la tua casa"
  on "AsHome".template_piani for insert
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Modifica solo i template della tua casa"
  on "AsHome".template_piani for update
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id))
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Elimina solo i template della tua casa"
  on "AsHome".template_piani for delete
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create table "AsHome".template_giorni (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references "AsHome".template_piani(id) on delete cascade,
  casa_id uuid references "AsHome".abitazioni(id) on delete cascade, -- denormalizzato dal template
  giorno_settimana smallint not null check (giorno_settimana between 0 and 6),
  unique (template_id, giorno_settimana)
);

alter table "AsHome".template_giorni enable row level security;

create policy "Leggi i template di sistema o quelli della tua casa"
  on "AsHome".template_giorni for select
  using (casa_id is null or "AsHome".is_membro_casa(casa_id));

create policy "Scrivi solo sui template della tua casa"
  on "AsHome".template_giorni for insert
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Modifica solo i template della tua casa"
  on "AsHome".template_giorni for update
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id))
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Elimina solo i template della tua casa"
  on "AsHome".template_giorni for delete
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create table "AsHome".template_pasti (
  id uuid primary key default gen_random_uuid(),
  template_giorno_id uuid not null references "AsHome".template_giorni(id) on delete cascade,
  casa_id uuid references "AsHome".abitazioni(id) on delete cascade,
  tipo_pasto_id uuid not null references "AsHome".tipi_pasto(id),
  unique (template_giorno_id, tipo_pasto_id)
);

alter table "AsHome".template_pasti enable row level security;

create policy "Leggi i template di sistema o quelli della tua casa"
  on "AsHome".template_pasti for select
  using (casa_id is null or "AsHome".is_membro_casa(casa_id));

create policy "Scrivi solo sui template della tua casa"
  on "AsHome".template_pasti for insert
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Modifica solo i template della tua casa"
  on "AsHome".template_pasti for update
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id))
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Elimina solo i template della tua casa"
  on "AsHome".template_pasti for delete
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create table "AsHome".template_pasto_categorie (
  id uuid primary key default gen_random_uuid(),
  template_pasto_id uuid not null references "AsHome".template_pasti(id) on delete cascade,
  casa_id uuid references "AsHome".abitazioni(id) on delete cascade,
  categoria_id uuid not null references "AsHome".categorie_alimento(id) on delete cascade,
  unique (template_pasto_id, categoria_id)
);

alter table "AsHome".template_pasto_categorie enable row level security;

create policy "Leggi i template di sistema o quelli della tua casa"
  on "AsHome".template_pasto_categorie for select
  using (casa_id is null or "AsHome".is_membro_casa(casa_id));

create policy "Scrivi solo sui template della tua casa"
  on "AsHome".template_pasto_categorie for insert
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Modifica solo i template della tua casa"
  on "AsHome".template_pasto_categorie for update
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id))
  with check (casa_id is not null and "AsHome".is_membro_casa(casa_id));

create policy "Elimina solo i template della tua casa"
  on "AsHome".template_pasto_categorie for delete
  using (casa_id is not null and "AsHome".is_membro_casa(casa_id));

alter publication supabase_realtime add table "AsHome".template_piani;
alter publication supabase_realtime add table "AsHome".template_giorni;
alter publication supabase_realtime add table "AsHome".template_pasti;
alter publication supabase_realtime add table "AsHome".template_pasto_categorie;

-- ══════════════════════════════════════════════════════════
-- 009_cosa_mi_manca.sql
-- ══════════════════════════════════════════════════════════
-- migrations/009_cosa_mi_manca.sql
-- Stato della checklist "Cosa mi manca" (punti 8-9 della richiesta).
--
-- Una riga per ogni alimento previsto in un piano: ho_gia = false di
-- default, cioè "manca" finché l'utente non lo spunta come già
-- disponibile. Operazione semplice e reversibile: basta un toggle,
-- sincronizzato in realtime come il resto dell'app. Non è un inventario
-- generale (fuori scope): è specifico di un piano, e perde significato
-- quando quel piano non è più la settimana corrente.

create table "AsHome".piano_alimenti_stato (
  id uuid primary key default gen_random_uuid(),
  piano_id uuid not null references "AsHome".piani(id) on delete cascade,
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade, -- denormalizzato dal piano
  alimento_id uuid not null references "AsHome".alimenti(id) on delete cascade,
  ho_gia boolean not null default false,
  aggiornato_il timestamptz not null default now(),
  unique (piano_id, alimento_id)
);

alter table "AsHome".piano_alimenti_stato enable row level security;
create policy "Solo membri della casa"
  on "AsHome".piano_alimenti_stato for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

alter publication supabase_realtime add table "AsHome".piano_alimenti_stato;

-- ══════════════════════════════════════════════════════════
-- 010_categorie_gestibili.sql
-- ══════════════════════════════════════════════════════════
-- migrations/010_categorie_gestibili.sql
-- Le categorie alimento restano condivise globalmente tra tutte le Case
-- (decisione presa in fase di progettazione: sono una tassonomia
-- concettuale, non un dato privato). Finora però l'app non offriva
-- alcuna interfaccia per gestirle: si potevano solo leggere e, via
-- codice, inserire. Questa migrazione aggiunge le policy mancanti per
-- rinominarle ed eliminarle dalla vista "Impostazioni".
--
-- Nota: essendo condivise, eliminare una categoria la rimuove per
-- TUTTE le Case che la usano (a cascata su alimenti_categorie e
-- template_pasto_categorie, che referenziano categorie_alimento
-- on delete cascade). L'interfaccia avvisa esplicitamente di questo
-- prima di confermare l'eliminazione.

create policy "Chiunque autenticato può rinominare una categoria"
  on "AsHome".categorie_alimento for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Chiunque autenticato può eliminare una categoria"
  on "AsHome".categorie_alimento for delete
  using (auth.uid() is not null);

-- ══════════════════════════════════════════════════════════
-- 011_categorie_nel_piano.sql
-- ══════════════════════════════════════════════════════════
-- migrations/011_categorie_nel_piano.sql
-- Ripensamento del rapporto tra template e piano, deciso dopo l'uso
-- reale: compilare un piano da un template NON deve chiedere subito
-- quale alimento scegliere per ogni categoria (quello era il vecchio
-- "wizard", eliminato). Deve invece portare nel piano stesso la
-- STRUTTURA a categorie del template (es. "Lunedì Pranzo" → sezioni
-- Carboidrati + Verdura), lasciando che sia poi la vista Piano, con
-- calma, a proporre — categoria per categoria — solo gli alimenti
-- della dispensa compatibili con quella sezione.
--
-- Due aggiunte, entrambe additive:

-- 1) Le sezioni-categoria di un pasto, ma nel PIANO stesso (non solo
--    nel template): stessa forma di template_pasto_categorie.
create table "AsHome".piano_pasto_categorie (
  id uuid primary key default gen_random_uuid(),
  piano_pasto_id uuid not null references "AsHome".piano_pasti(id) on delete cascade,
  casa_id uuid not null references "AsHome".abitazioni(id) on delete cascade,
  categoria_id uuid not null references "AsHome".categorie_alimento(id) on delete cascade,
  unique (piano_pasto_id, categoria_id)
);

alter table "AsHome".piano_pasto_categorie enable row level security;
create policy "Solo membri della casa"
  on "AsHome".piano_pasto_categorie for all
  using ("AsHome".is_membro_casa(casa_id))
  with check ("AsHome".is_membro_casa(casa_id));

alter publication supabase_realtime add table "AsHome".piano_pasto_categorie;

-- 2) Ogni alimento aggiunto a un pasto ricorda sotto quale sezione è
--    stato messo (nullable: un pasto senza sezioni dichiarate — piano
--    creato vuoto — continua a funzionare come lista piatta, esattamente
--    come oggi). Se la categoria viene eliminata, l'alimento NON sparisce
--    dal pasto: perde solo l'etichetta di sezione (torna nel gruppo
--    generico), coerente con l'approccio non distruttivo del resto del progetto.
alter table "AsHome".piano_pasto_alimenti
  add column categoria_id uuid references "AsHome".categorie_alimento(id) on delete set null;

