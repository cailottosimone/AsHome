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
