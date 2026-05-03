-- =====================================================================
-- Migration 002 — Corrige signup, bloqueio e datas de cadastro
-- =====================================================================
-- 1. Trigger handle_new_user agora cria uma company para todo signup
--    sem company_id no metadata, e vincula o profile a ela.
-- 2. Backfill: cria companies para profiles órfãos (company_id IS NULL).
-- 3. RLS: permite que o trigger (SECURITY DEFINER) e SUPERADMIN insiram
--    em companies. Usuários comuns continuam não podendo inserir do cliente.
-- 4. Garante que profiles.is_active seja respeitado: SUPERADMIN faz UPDATE
--    via service-role no endpoint /api/admin/users.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Substitui o trigger handle_new_user
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_company_id uuid;
  new_company_id  uuid;
  display_name    text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  -- Se o metadata trouxe company_id (ex.: convite de membro), usa.
  IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL
     AND NEW.raw_user_meta_data->>'company_id' <> '' THEN
    BEGIN
      meta_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      meta_company_id := NULL;
    END;
  END IF;

  IF meta_company_id IS NOT NULL THEN
    new_company_id := meta_company_id;
  ELSE
    -- Cria empresa nova para o signup (autocadastro).
    INSERT INTO companies (name, plan, monthly_value, plan_start_date, plan_end_date,
                           billing_status, is_paused, active_users)
    VALUES (
      'Engenharia ' || display_name,
      'Básico',
      199,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      'ACTIVE',
      false,
      1
    )
    RETURNING id INTO new_company_id;
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
-- 2. Backfill — cria company para cada profile órfão e vincula
-- ---------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  c_id uuid;
BEGIN
  FOR rec IN
    SELECT p.id, p.name, p.created_at
    FROM profiles p
    WHERE p.company_id IS NULL
      AND COALESCE(p.role, '') <> 'SUPERADMIN'
  LOOP
    INSERT INTO companies (name, plan, monthly_value, plan_start_date, plan_end_date,
                           billing_status, is_paused, active_users, created_at)
    VALUES (
      'Engenharia ' || COALESCE(rec.name, 'Sem nome'),
      'Básico',
      199,
      COALESCE(rec.created_at::date, CURRENT_DATE),
      COALESCE(rec.created_at::date, CURRENT_DATE) + INTERVAL '30 days',
      'ACTIVE',
      false,
      1,
      COALESCE(rec.created_at, now())
    )
    RETURNING id INTO c_id;

    UPDATE profiles SET company_id = c_id WHERE id = rec.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Garante que profiles.is_active não é NULL (default já é true,
--    mas linhas antigas podem ter NULL).
-- ---------------------------------------------------------------------
UPDATE profiles SET is_active = true WHERE is_active IS NULL;
ALTER TABLE profiles ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;

-- ---------------------------------------------------------------------
-- 4. Garante updated_at em companies (esquema 001 não criava).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 5. RLS — mantém companies_insert restrito a SUPERADMIN no cliente.
--    O trigger handle_new_user é SECURITY DEFINER, então bypass RLS.
--    Nada a alterar aqui.
-- ---------------------------------------------------------------------
