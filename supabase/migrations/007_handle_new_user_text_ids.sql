-- =====================================================================
-- Migration 007 — handle_new_user usa text em company.id
-- =====================================================================
-- O schema real do projeto é:
--   companies.id           text
--   profiles.company_id    text
--   team_members.company_id text
--   profiles.id            uuid (FK para auth.users.id)
--
-- As migrations 005/006 declararam meta_company_id/new_company_id como
-- uuid, causando "operator does not exist: text = uuid" quando o trigger
-- comparava companies.id (text) com a variável uuid.
--
-- Esta migration:
--   - usa text nas variáveis (alinhado ao schema real)
--   - mantém o SET search_path = public, pg_temp da 006
--   - gera novo company id com gen_random_uuid()::text quando preciso
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;
