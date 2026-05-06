-- Cada obra agora tem seu próprio cronograma de calendário.
-- Importante: projects.id é TEXT no schema real (ver migration 007),
-- então project_id também precisa ser TEXT.
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS project_id text REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS calendar_events_project_id_idx ON calendar_events(project_id);

-- Atualiza policy para permitir acesso quando o evento pertence a um projeto da empresa
DROP POLICY IF EXISTS "calendar_events_all" ON calendar_events;
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL
  USING (
    is_superadmin()
    OR company_id = get_my_company_id()
    OR project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );
