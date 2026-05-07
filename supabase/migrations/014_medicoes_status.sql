-- 014_medicoes_status.sql
-- Adiciona coluna `status` em medicoes para suportar Kanban com 4 estados:
-- lancada -> em_analise -> aprovada -> paga

ALTER TABLE medicoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'lancada'
  CHECK (status IN ('lancada','em_analise','aprovada','paga'));

ALTER TABLE medicoes ADD COLUMN IF NOT EXISTS aprovada_por text;
ALTER TABLE medicoes ADD COLUMN IF NOT EXISTS aprovada_em timestamptz;
ALTER TABLE medicoes ADD COLUMN IF NOT EXISTS paga_em timestamptz;

-- Índice para queries do Kanban (filtra por projeto + status)
CREATE INDEX IF NOT EXISTS idx_medicoes_project_status
  ON medicoes(project_id, status);
