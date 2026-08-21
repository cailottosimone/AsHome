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
