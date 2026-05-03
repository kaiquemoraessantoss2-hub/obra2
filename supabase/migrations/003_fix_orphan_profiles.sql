-- =====================================================================
-- Migration 003 — Conserta profiles com company_id órfão
-- =====================================================================
-- Contexto: a migration 002 só fazia backfill de profiles com
-- company_id IS NULL. Mas usuários antigos foram cadastrados com
-- company_id = 'comp_<user_id>' (string que não referencia nenhuma
-- linha de companies). Esses profiles são órfãos: o login funciona,
-- mas todas as queries por company_id retornam vazio.
--
-- Esta migration:
--   1. Identifica profiles cujo company_id não existe em companies.
--   2. Cria uma company nova para cada órfão e atualiza o profile.
--   3. Atualiza projects/floors/etc. existentes que usavam o id antigo.
--   4. Remove policies legadas redundantes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Backfill de profiles com company_id que não existe em companies
-- ---------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  new_cid text;
  old_cid text;
BEGIN
  FOR rec IN
    SELECT p.id, p.name, p.company_id AS old_cid, p.created_at
    FROM profiles p
    WHERE p.role <> 'SUPERADMIN'
      AND p.company_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = p.company_id)
  LOOP
    old_cid := rec.old_cid;

    -- Cria company nova com id como text (o schema é text, não uuid)
    new_cid := gen_random_uuid()::text;
    INSERT INTO companies (id, name, plan, monthly_value, plan_start_date,
                           plan_end_date, billing_status, is_paused,
                           active_users, created_at)
    VALUES (
      new_cid,
      'Engenharia ' || COALESCE(rec.name, 'Sem nome'),
      'Básico',
      199,
      COALESCE(rec.created_at::date, CURRENT_DATE),
      COALESCE(rec.created_at::date, CURRENT_DATE) + INTERVAL '30 days',
      'ACTIVE',
      false,
      1,
      COALESCE(rec.created_at, now())
    );

    UPDATE profiles SET company_id = new_cid WHERE id = rec.id;

    -- Migra qualquer projeto/floor/phase que estava usando o company_id antigo
    UPDATE projects SET company_id = new_cid WHERE company_id = old_cid;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. Atualiza o trigger handle_new_user para usar text em company.id
--    (já que o schema real é text, não uuid)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_company_id text;
  new_company_id  text;
  display_name    text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  meta_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '');

  IF meta_company_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM companies WHERE id = meta_company_id) THEN
    new_company_id := meta_company_id;
  ELSE
    new_company_id := gen_random_uuid()::text;
    INSERT INTO companies (id, name, plan, monthly_value, plan_start_date,
                           plan_end_date, billing_status, is_paused, active_users)
    VALUES (
      new_company_id,
      'Engenharia ' || display_name,
      'Básico',
      199,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      'ACTIVE',
      false,
      1
    );
  END IF;

  INSERT INTO profiles (id, name, role, company_id, is_active)
  VALUES (
    NEW.id,
    display_name,
    COALESCE(NEW.raw_user_meta_data->>'role', 'ADMIN'),
    new_company_id,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 3. Remove policies legadas redundantes (mantém só *_all)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Access floors by project company" ON floors;
DROP POLICY IF EXISTS "Users can view their own company floors" ON floors;

DROP POLICY IF EXISTS "Access phases by project company" ON project_phases;
DROP POLICY IF EXISTS "Users can view their own company phases" ON project_phases;

DROP POLICY IF EXISTS "Access projects by company_id" ON projects;
DROP POLICY IF EXISTS "Users can view their own company projects" ON projects;

-- ---------------------------------------------------------------------
-- 4. Garante que profiles_insert permita o trigger (SECURITY DEFINER já bypass)
--    e que companies_insert também permita (idem). Nada a alterar.
-- ---------------------------------------------------------------------
