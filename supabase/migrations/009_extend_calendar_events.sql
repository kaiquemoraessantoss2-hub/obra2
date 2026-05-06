-- Extende calendar_events para suportar os campos usados pelo componente:
-- type (TASK/DELIVERY), day (1-31), time (HH:mm), status (PENDING/COMPLETED).
-- date deixa de ser obrigatório, já que o componente trabalha com day + mês corrente.
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS type   text,
  ADD COLUMN IF NOT EXISTS day    integer,
  ADD COLUMN IF NOT EXISTS time   text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

ALTER TABLE calendar_events
  ALTER COLUMN date DROP NOT NULL;
