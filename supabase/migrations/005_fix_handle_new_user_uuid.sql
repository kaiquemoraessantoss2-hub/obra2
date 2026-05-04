-- =====================================================================
-- Migration 005 — Corrige handle_new_user (volta a usar uuid)
-- =====================================================================
-- A migration 003 deixou o trigger usando text para meta_company_id,
-- mas companies.id é uuid. Isso fazia "WHERE id = meta_company_id" falhar
-- com "operator does not exist: uuid = text" sempre que o metadata trazia
-- company_id (caso típico de criação de membros via /api/admin/members).
-- O sintoma no app é: "Database error creating new user" ao criar membro.
--
-- Esta migration restaura o trigger para a versão da 002 (uuid + cast
-- protegido por EXCEPTION), que funciona tanto para autosignup
-- (company_id ausente) quanto para criação de membros (company_id
-- presente no user_metadata).
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
