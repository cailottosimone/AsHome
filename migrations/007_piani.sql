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
