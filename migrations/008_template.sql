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
