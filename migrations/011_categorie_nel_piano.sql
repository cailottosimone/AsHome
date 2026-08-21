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
