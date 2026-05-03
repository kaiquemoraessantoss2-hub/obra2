-- 004_plans_catalog.sql
-- Catálogo de planos do sistema (SUPERADMIN gerencia)

CREATE TABLE IF NOT EXISTS plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text UNIQUE NOT NULL,
  monthly_value numeric NOT NULL DEFAULT 0,
  max_members   integer NOT NULL DEFAULT 0,
  modules       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION plans_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_updated_at ON plans;
CREATE TRIGGER plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION plans_set_updated_at();

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_authenticated" ON plans;
CREATE POLICY "plans_select_authenticated" ON plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "plans_insert_superadmin" ON plans;
CREATE POLICY "plans_insert_superadmin" ON plans
  FOR INSERT WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "plans_update_superadmin" ON plans;
CREATE POLICY "plans_update_superadmin" ON plans
  FOR UPDATE USING (is_superadmin());

DROP POLICY IF EXISTS "plans_delete_superadmin" ON plans;
CREATE POLICY "plans_delete_superadmin" ON plans
  FOR DELETE USING (is_superadmin());

-- Seed dos 3 planos atuais (idempotente)
INSERT INTO plans (name, monthly_value, max_members, modules) VALUES
  ('Básico', 199, 0, '{
    "DASHBOARD":"VER",
    "CRONOGRAMA":"VER",
    "PAVIMENTOS":"BLOQUEADO",
    "MEDICAO":"BLOQUEADO",
    "DOCUMENTOS":"BLOQUEADO",
    "PENDENCIAS":"VER",
    "MEDICAO_OBRA":"VER"
  }'::jsonb),
  ('Pro', 499, 3, '{
    "DASHBOARD":"VER",
    "CRONOGRAMA":"VER",
    "PAVIMENTOS":"VER",
    "MEDICAO":"VER",
    "DOCUMENTOS":"VER",
    "PENDENCIAS":"VER",
    "MEDICAO_OBRA":"VER"
  }'::jsonb),
  ('Empresa', 1200, 5, '{
    "DASHBOARD":"EDITAR",
    "CRONOGRAMA":"EDITAR",
    "PAVIMENTOS":"EDITAR",
    "MEDICAO":"EDITAR",
    "DOCUMENTOS":"EDITAR",
    "PENDENCIAS":"EDITAR",
    "MEDICAO_OBRA":"EDITAR"
  }'::jsonb)
ON CONFLICT (name) DO NOTHING;
