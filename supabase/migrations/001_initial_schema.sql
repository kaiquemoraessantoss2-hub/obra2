-- companies
CREATE TABLE IF NOT EXISTS companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  plan            text NOT NULL DEFAULT 'Básico',
  monthly_value   numeric DEFAULT 0,
  plan_start_date date,
  plan_end_date   date,
  billing_status  text NOT NULL DEFAULT 'ACTIVE',
  is_paused       boolean DEFAULT false,
  active_users    integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  uuid REFERENCES companies(id) ON DELETE SET NULL,
  name        text NOT NULL,
  role        text NOT NULL DEFAULT 'VIEWER',
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- trigger: cria profile automaticamente quando um user é criado no Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'VIEWER'),
    CASE
      WHEN NEW.raw_user_meta_data->>'company_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'company_id')::uuid
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  location        text,
  total_floors    integer DEFAULT 0,
  basements       integer DEFAULT 0,
  has_leisure     boolean DEFAULT false,
  has_atrium      boolean DEFAULT false,
  technical_areas integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- floors
CREATE TABLE IF NOT EXISTS floors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number     integer NOT NULL,
  label      text NOT NULL,
  type       text NOT NULL DEFAULT 'REGULAR',
  phase      text,
  created_at timestamptz DEFAULT now()
);

-- project_phases (sub_steps e history armazenados como JSONB)
CREATE TABLE IF NOT EXISTS project_phases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              text NOT NULL,
  icon              text,
  color             text,
  progress          integer DEFAULT 0,
  status            text DEFAULT 'NOT_STARTED',
  weight            integer DEFAULT 1,
  start_date        date,
  end_date          date,
  actual_start_date date,
  actual_end_date   date,
  responsible       text,
  observations      text,
  depends_on        uuid[],
  approved_by       text,
  approved_at       timestamptz,
  blocked_reason    text,
  sub_steps         jsonb DEFAULT '[]',
  history           jsonb DEFAULT '[]',
  sort_order        integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- building_configs
CREATE TABLE IF NOT EXISTS building_configs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  name                 text NOT NULL,
  address              text,
  total_floors         integer DEFAULT 0,
  basements            integer DEFAULT 0,
  has_leisure          boolean DEFAULT false,
  has_atrium           boolean DEFAULT false,
  has_rooftop          boolean DEFAULT false,
  technical_areas      integer DEFAULT 0,
  apartments_per_floor integer DEFAULT 0,
  total_units          integer DEFAULT 0,
  floors               jsonb DEFAULT '[]',
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- team_members (usuários Supabase Auth com role=VIEWER, metadados extras aqui)
CREATE TABLE IF NOT EXISTS team_members (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  permissions jsonb DEFAULT '{}',
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title       text NOT NULL,
  date        date NOT NULL,
  description text,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now()
);

-- gargalos
CREATE TABLE IF NOT EXISTS gargalos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- medicoes
CREATE TABLE IF NOT EXISTS medicoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  disciplina     text NOT NULL,
  contratante    text,
  descricao      text NOT NULL,
  quantidade     numeric NOT NULL DEFAULT 0,
  unidade        text,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total    numeric NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  created_by     text
);

-- pendencias
CREATE TABLE IF NOT EXISTS pendencias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  conteudo      text NOT NULL,
  responsavel   text,
  nome_membro   text,
  concluida     boolean DEFAULT false,
  concluida_por text,
  concluida_em  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gargalos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendencias ENABLE ROW LEVEL SECURITY;

-- Helper: retorna company_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: verifica se usuário logado é SUPERADMIN
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
  SELECT role = 'SUPERADMIN' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- companies
CREATE POLICY "companies_select" ON companies FOR SELECT
  USING (is_superadmin() OR id = get_my_company_id());
CREATE POLICY "companies_insert" ON companies FOR INSERT
  WITH CHECK (is_superadmin());
CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING (is_superadmin() OR id = get_my_company_id());
CREATE POLICY "companies_delete" ON companies FOR DELETE
  USING (is_superadmin());

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (is_superadmin() OR company_id = get_my_company_id() OR id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (
    is_superadmin()
    OR (id = auth.uid() AND role = 'VIEWER')
  );
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (is_superadmin() OR id = auth.uid());
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (is_superadmin());

-- projects
CREATE POLICY "projects_all" ON projects FOR ALL
  USING (is_superadmin() OR company_id = get_my_company_id());

-- floors
CREATE POLICY "floors_all" ON floors FOR ALL
  USING (
    is_superadmin() OR
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

-- project_phases
CREATE POLICY "project_phases_all" ON project_phases FOR ALL
  USING (
    is_superadmin() OR
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

-- building_configs
CREATE POLICY "building_configs_all" ON building_configs FOR ALL
  USING (
    is_superadmin() OR
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

-- team_members
CREATE POLICY "team_members_all" ON team_members FOR ALL
  USING (is_superadmin() OR company_id = get_my_company_id());

-- calendar_events
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL
  USING (is_superadmin() OR company_id = get_my_company_id());

-- gargalos
CREATE POLICY "gargalos_all" ON gargalos FOR ALL
  USING (is_superadmin() OR company_id = get_my_company_id());

-- medicoes
CREATE POLICY "medicoes_all" ON medicoes FOR ALL
  USING (
    is_superadmin() OR
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

-- pendencias
CREATE POLICY "pendencias_all" ON pendencias FOR ALL
  USING (
    is_superadmin() OR
    project_id IN (SELECT id FROM projects WHERE company_id = get_my_company_id())
  );

-- =====================
-- INDEXES (foreign keys)
-- =====================

CREATE INDEX ON profiles(company_id);
CREATE INDEX ON projects(company_id);
CREATE INDEX ON floors(project_id);
CREATE INDEX ON project_phases(project_id);
CREATE INDEX ON building_configs(project_id);
CREATE INDEX ON team_members(owner_id);
CREATE INDEX ON team_members(company_id);
CREATE INDEX ON calendar_events(company_id);
CREATE INDEX ON calendar_events(created_by);
CREATE INDEX ON gargalos(company_id);
CREATE INDEX ON medicoes(project_id);
CREATE INDEX ON pendencias(project_id);

-- =====================
-- AUTO-UPDATE updated_at
-- =====================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_project_phases_updated_at
  BEFORE UPDATE ON project_phases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_building_configs_updated_at
  BEFORE UPDATE ON building_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_gargalos_updated_at
  BEFORE UPDATE ON gargalos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
