-- Permite restringir o acesso de cada membro a obras específicas.
-- NULL ou array vazio = acesso a TODAS as obras (comportamento padrão atual).
-- Lista de IDs = acesso restrito apenas àquelas obras.
-- projects.id é TEXT no schema real, então project_ids precisa ser TEXT[].
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS project_ids text[] DEFAULT NULL;
