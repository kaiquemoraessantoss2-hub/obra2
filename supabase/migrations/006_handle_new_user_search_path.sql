-- =====================================================================
-- Migration 006 — handle_new_user precisa de search_path explícito
-- =====================================================================
-- O Postgres logs mostraram:
--   ERROR: relation "companies" does not exist (SQLSTATE 42P01)
--
-- Causa: o trigger é SECURITY DEFINER e roda sob uma conexão cuja
-- search_path padrão não inclui public. As referências `companies` e
-- `profiles` resolvem em qualquer schema do search_path — quando ele é
-- algo como "$user, auth", o Postgres não encontra public.companies.
--
-- Sintoma no Auth: "Database error creating new user".
--
-- Fix: declarar SET search_path = public, pg_temp na função.
-- Mantemos toda a lógica idêntica à 005 (uuid).
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  meta_company_id uuid;
  new_company_id  uuid;
  display_name    text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);

  IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL
     AND NEW.raw_user_meta_data->>'company_id' <> '' THEN
    BEGIN
      meta_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      meta_company_id := NULL;
    END;
  END IF;

  IF meta_company_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM companies WHERE id = meta_company_id) THEN
    new_company_id := meta_company_id;
  ELSE
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
$$;
