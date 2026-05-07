-- 013_pendencias_status.sql
-- Adiciona coluna `status` em pendencias para suportar Kanban com 4 estados.
-- Mantém coluna `concluida` legada sincronizada via trigger até deprecação.

-- 1. Adicionar coluna status com default que preserva pendências existentes
ALTER TABLE pendencias
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'a_fazer'
  CHECK (status IN ('a_fazer','em_andamento','aguardando_aprovacao','concluida'));

-- 2. Backfill: pendências com concluida=true viram status='concluida'
UPDATE pendencias SET status = 'concluida' WHERE concluida = true AND status = 'a_fazer';

-- 3. Índice para queries do Kanban (filtra por projeto + status)
CREATE INDEX IF NOT EXISTS idx_pendencias_project_status
  ON pendencias(project_id, status);

-- 4. Trigger: manter `concluida` em sincronia com `status`
CREATE OR REPLACE FUNCTION sync_pendencia_concluida()
RETURNS TRIGGER AS $$
BEGIN
  NEW.concluida := (NEW.status = 'concluida');
  -- Se está virando concluida e não tinha concluida_em, registra timestamp
  IF NEW.status = 'concluida' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'concluida') THEN
    NEW.concluida_em := COALESCE(NEW.concluida_em, now());
  END IF;
  -- Se está saindo de concluida, limpa os campos
  IF TG_OP = 'UPDATE' AND NEW.status <> 'concluida' AND OLD.status = 'concluida' THEN
    NEW.concluida_em := NULL;
    NEW.concluida_por := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_pendencia_sync_concluida ON pendencias;
CREATE TRIGGER tr_pendencia_sync_concluida
  BEFORE INSERT OR UPDATE ON pendencias
  FOR EACH ROW EXECUTE FUNCTION sync_pendencia_concluida();
