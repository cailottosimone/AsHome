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
