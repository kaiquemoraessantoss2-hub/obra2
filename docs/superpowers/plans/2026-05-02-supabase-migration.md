# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar todos os dados do localStorage para o Supabase, usando Supabase Auth para autenticação de todos os usuários (admins, engenheiros e membros do time).

**Architecture:** Supabase Auth gerencia autenticação. Uma tabela `profiles` estende `auth.users` com `role` e `company_id`. Todos os dados ficam em tabelas PostgreSQL com RLS por `company_id`. As funções de storage são convertidas de síncronas para `async/await`.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Auth + PostgreSQL), @supabase/supabase-js

---

### Task 1: SQL Schema + Environment Setup

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Modify: `src/lib/supabase.ts`
- Create: `.env.local`

- [ ] **Step 1: Criar `.env.local` na raiz do projeto**

```
NEXT_PUBLIC_SUPABASE_URL=https://lxwbzshvnqwbypoflccz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_eGpDdgB15CY7WugD7We_mg_fl24CSXG
```

- [ ] **Step 2: Atualizar `src/lib/supabase.ts` para usar variáveis de ambiente**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Criar `supabase/migrations/001_initial_schema.sql`**

```sql
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
  WITH CHECK (is_superadmin() OR id = auth.uid());
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
```

- [ ] **Step 4: Executar o SQL no Supabase Dashboard**

1. Acesse https://supabase.com/dashboard
2. Selecione o projeto `lxwbzshvnqwbypoflccz`
3. Vá em **SQL Editor**
4. Cole o conteúdo completo de `supabase/migrations/001_initial_schema.sql`
5. Clique em **Run**
6. Verifique que todas as tabelas aparecem em **Table Editor**

- [ ] **Step 5: Criar empresa master e usuário SUPERADMIN**

No **SQL Editor**, execute:

```sql
INSERT INTO companies (id, name, plan, billing_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'ObraFlow SaaS', 'Empresa', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
```

Em **Authentication > Users**, clique em **Add User**:
- Email: `admin@obraflow.com`
- Password: `admin123`
- Auto Confirm User: ✓

Depois no SQL Editor:
```sql
UPDATE profiles
SET role = 'SUPERADMIN', company_id = '00000000-0000-0000-0000-000000000001'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@obraflow.com');
```

- [ ] **Step 6: Commit**

```bash
git add supabase/ src/lib/supabase.ts .env.local
git commit -m "feat: add supabase schema migrations and update env config"
```

---

### Task 2: Migrar `src/lib/auth.ts` — Auth, Users, Companies, Projects, Calendar, Gargalos

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Substituir todo o conteúdo de `src/lib/auth.ts`**

```typescript
'use client';

import { supabase } from './supabase';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'ENGINEER' | 'VIEWER';
  companyId: string;
  isActive?: boolean;
}

// =====================
// AUTH
// =====================

export async function signIn(email: string, password: string): Promise<StoredUser | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, company_id, is_active')
    .eq('id', data.user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: data.user.email!,
    name: profile.name,
    role: profile.role as StoredUser['role'],
    companyId: profile.company_id,
    isActive: profile.is_active,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<StoredUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, company_id, is_active')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: user.email!,
    name: profile.name,
    role: profile.role as StoredUser['role'],
    companyId: profile.company_id,
    isActive: profile.is_active,
  };
}

// =====================
// USERS
// =====================

export async function getAllUsers(): Promise<StoredUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, company_id, is_active');
  if (error || !data) return [];
  return data.map(p => ({
    id: p.id,
    email: '',
    name: p.name,
    role: p.role as StoredUser['role'],
    companyId: p.company_id,
    isActive: p.is_active,
  }));
}

export async function saveUser(user: Omit<StoredUser, 'id'> & { password: string }): Promise<StoredUser | null> {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    user_metadata: {
      name: user.name,
      role: user.role,
      company_id: user.companyId,
    },
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error('Erro ao criar usuário:', error);
    return null;
  }

  await supabase.from('profiles').update({
    company_id: user.companyId,
    role: user.role,
    is_active: user.isActive ?? true,
  }).eq('id', data.user.id);

  return {
    id: data.user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    isActive: user.isActive ?? true,
  };
}

export async function updateUserActive(userId: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);
  return !error;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return !error;
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  return !error;
}

export async function loadUserProfilesFromSupabase(): Promise<StoredUser[]> {
  return getAllUsers();
}

// =====================
// COMPANIES
// =====================

export async function loadCompanies(): Promise<any[]> {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) return [];
  return data ?? [];
}

export async function saveCompany(company: any): Promise<void> {
  const { id, ...rest } = company;
  if (id) {
    await supabase.from('companies').upsert({ id, ...rest });
  } else {
    await supabase.from('companies').insert(rest);
  }
}

export async function saveCompanies(companies: any[]): Promise<void> {
  for (const company of companies) {
    await saveCompany(company);
  }
}

export async function deleteCompany(companyId: string): Promise<boolean> {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  return !error;
}

// =====================
// PROJECTS
// =====================

export async function loadProjects(companyId?: string): Promise<any[]> {
  let query = supabase.from('projects').select('*');
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function saveProject(project: any): Promise<void> {
  const { id, companyId, ...rest } = project;
  const record = { ...rest, company_id: companyId ?? rest.company_id };
  if (id) {
    await supabase.from('projects').upsert({ id, ...record });
  } else {
    await supabase.from('projects').insert(record);
  }
}

export async function saveProjects(projects: any[]): Promise<void> {
  for (const project of projects) {
    await saveProject(project);
  }
}

export async function deleteProjectsByCompany(companyId: string): Promise<boolean> {
  const { error } = await supabase.from('projects').delete().eq('company_id', companyId);
  return !error;
}

// =====================
// TEAM
// =====================

export async function loadTeamByCompany(companyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('company_id', companyId);
  if (error) return [];
  return data ?? [];
}

export async function saveTeamByCompany(companyId: string, team: any[]): Promise<void> {
  for (const member of team) {
    await supabase.from('team_members').upsert({ ...member, company_id: companyId });
  }
}

// =====================
// CALENDAR
// =====================

export async function loadCalendarEvents(companyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function saveCalendarEvents(companyId: string, events: any[]): Promise<void> {
  await supabase.from('calendar_events').delete().eq('company_id', companyId);
  if (events.length > 0) {
    await supabase.from('calendar_events').insert(
      events.map(e => ({ ...e, company_id: companyId }))
    );
  }
}

// =====================
// GARGALOS
// =====================

export async function loadGargalosByCompany(companyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('gargalos')
    .select('*')
    .eq('company_id', companyId);
  if (error) return [];
  return (data ?? []).map(g => g.data);
}

export async function saveGargalosByCompany(companyId: string, gargalos: any[]): Promise<void> {
  await supabase.from('gargalos').delete().eq('company_id', companyId);
  if (gargalos.length > 0) {
    await supabase.from('gargalos').insert(
      gargalos.map(g => ({ data: g, company_id: companyId }))
    );
  }
}

// =====================
// LEGACY — mantidos para compatibilidade
// =====================

export const defaultUsers: StoredUser[] = [];
export const defaultCompanies: any[] = [];
export function clearAllData(): void {}
export function resetToCleanState(): void {}
export function initializeDefaultData(): void {}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Corrija quaisquer erros antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: migrate auth.ts to supabase auth and postgres"
```

---

### Task 3: Migrar `src/lib/projectStorage.ts`

**Files:**
- Modify: `src/lib/projectStorage.ts`

- [ ] **Step 1: Substituir todo o conteúdo de `src/lib/projectStorage.ts`**

```typescript
import { supabase } from './supabase';
import { Project, ConstructionPhase, BuildingConfig } from '@/types';

// =====================
// PROJECT DATA
// =====================

export async function saveProjectData(project: Project): Promise<void> {
  if (!project.id) return;
  const { floors, phases, ...rest } = project;
  await supabase.from('projects').upsert({
    id: project.id,
    company_id: project.companyId,
    name: rest.name,
    location: rest.location,
    total_floors: rest.totalFloors,
    basements: rest.basements,
    has_leisure: rest.hasLeisure,
    has_atrium: rest.hasAtrium,
    technical_areas: rest.technicalAreas,
    updated_at: new Date().toISOString(),
  });

  if (floors && floors.length > 0) {
    await supabase.from('floors').delete().eq('project_id', project.id);
    await supabase.from('floors').insert(
      floors.map(f => ({
        id: f.id,
        project_id: project.id,
        number: f.number,
        label: f.label,
        type: f.type,
        phase: f.phase,
      }))
    );
  }
}

export async function loadProjectData(projectId: string): Promise<Project | null> {
  if (!projectId) return null;
  const { data: p, error } = await supabase
    .from('projects')
    .select('*, floors(*)')
    .eq('id', projectId)
    .single();

  if (error || !p) return null;

  return {
    id: p.id,
    companyId: p.company_id,
    name: p.name,
    location: p.location ?? '',
    totalFloors: p.total_floors,
    basements: p.basements,
    hasLeisure: p.has_leisure,
    hasAtrium: p.has_atrium,
    technicalAreas: p.technical_areas,
    floors: (p.floors ?? []).map((f: any) => ({
      id: f.id,
      number: f.number,
      label: f.label,
      type: f.type,
      phase: f.phase ?? '',
      services: [],
    })),
  };
}

export async function deleteProjectData(projectId: string): Promise<void> {
  if (!projectId) return;
  await supabase.from('projects').delete().eq('id', projectId);
}

// =====================
// PROJECT PHASES
// =====================

export async function saveProjectPhases(projectId: string, phases: ConstructionPhase[]): Promise<void> {
  if (!projectId) return;
  await supabase.from('project_phases').delete().eq('project_id', projectId);

  if (phases.length > 0) {
    await supabase.from('project_phases').insert(
      phases.map((phase, index) => ({
        id: phase.id,
        project_id: projectId,
        name: phase.name,
        icon: phase.icon,
        color: phase.color,
        progress: phase.progress,
        status: phase.status,
        weight: phase.weight,
        start_date: phase.startDate || null,
        end_date: phase.endDate || null,
        actual_start_date: phase.actualStartDate || null,
        actual_end_date: phase.actualEndDate || null,
        responsible: phase.responsible,
        observations: phase.observations,
        depends_on: phase.dependsOn ?? [],
        approved_by: phase.approvedBy,
        approved_at: phase.approvedAt || null,
        blocked_reason: phase.blockedReason,
        sub_steps: phase.subSteps,
        history: phase.history ?? [],
        sort_order: index,
        updated_at: new Date().toISOString(),
      }))
    );
  }
}

export async function loadProjectPhases(projectId: string): Promise<ConstructionPhase[] | null> {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return null;

  return data.map(row => ({
    id: row.id,
    name: row.name,
    icon: row.icon ?? '',
    color: row.color ?? '',
    progress: row.progress,
    status: row.status,
    weight: row.weight,
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    actualStartDate: row.actual_start_date,
    actualEndDate: row.actual_end_date,
    responsible: row.responsible ?? '',
    observations: row.observations,
    dependsOn: row.depends_on ?? [],
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    blockedReason: row.blocked_reason,
    subSteps: row.sub_steps ?? [],
    history: row.history ?? [],
  }));
}

export async function removeProjectPhases(projectId: string): Promise<void> {
  if (!projectId) return;
  await supabase.from('project_phases').delete().eq('project_id', projectId);
}

// =====================
// PROJECT CONFIG (building_configs)
// =====================

export async function saveProjectConfig(projectId: string, config: BuildingConfig): Promise<void> {
  if (!projectId) return;
  await supabase.from('building_configs').upsert({
    id: config.id,
    project_id: projectId,
    name: config.name,
    address: config.address,
    total_floors: config.totalFloors,
    basements: config.basements,
    has_leisure: config.hasLeisure,
    has_atrium: config.hasAtrium,
    has_rooftop: config.hasRooftop,
    technical_areas: config.technicalAreas,
    apartments_per_floor: config.apartmentsPerFloor,
    total_units: config.totalUnits,
    floors: config.floors,
    updated_at: new Date().toISOString(),
  });
}

export async function loadProjectConfig(projectId: string): Promise<BuildingConfig | null> {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from('building_configs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    address: data.address ?? '',
    totalFloors: data.total_floors,
    basements: data.basements,
    hasLeisure: data.has_leisure,
    hasAtrium: data.has_atrium,
    hasRooftop: data.has_rooftop,
    technicalAreas: data.technical_areas,
    apartmentsPerFloor: data.apartments_per_floor,
    totalUnits: data.total_units,
    floors: data.floors ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function removeProjectConfig(projectId: string): Promise<void> {
  if (!projectId) return;
  await supabase.from('building_configs').delete().eq('project_id', projectId);
}

// =====================
// PROJECT EXECUTIONS (usa a mesma tabela de phases)
// =====================

export async function saveProjectExecutions(projectId: string, phases: ConstructionPhase[]): Promise<void> {
  return saveProjectPhases(projectId, phases);
}

export async function loadProjectExecutions(projectId: string): Promise<ConstructionPhase[] | null> {
  return loadProjectPhases(projectId);
}

export async function removeProjectExecutions(projectId: string): Promise<void> {
  return removeProjectPhases(projectId);
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/projectStorage.ts
git commit -m "feat: migrate projectStorage.ts to supabase"
```

---

### Task 4: Migrar `src/lib/buildingStorage.ts` e `src/context/ConstructionContext.tsx`

**Files:**
- Modify: `src/lib/buildingStorage.ts`
- Modify: `src/context/ConstructionContext.tsx`

- [ ] **Step 1: Atualizar funções save/load em `src/lib/buildingStorage.ts`**

Substitua apenas as funções `saveBuildingConfig`, `loadBuildingConfig`, `saveFloorExecutions` e `loadFloorExecutions`. As funções de cálculo (`recalculateSubStepProgress`, `recalculatePhaseProgress`, `updateFloorExecutionInPhase`, `bulkUpdateFloorExecutions`) **não mudam**.

```typescript
import { supabase } from './supabase';
import { BuildingConfig, ConstructionPhase } from '@/types';

export async function saveBuildingConfig(config: BuildingConfig, projectId: string): Promise<void> {
  await supabase.from('building_configs').upsert({
    id: config.id,
    project_id: projectId,
    name: config.name,
    address: config.address,
    total_floors: config.totalFloors,
    basements: config.basements,
    has_leisure: config.hasLeisure,
    has_atrium: config.hasAtrium,
    has_rooftop: config.hasRooftop,
    technical_areas: config.technicalAreas,
    apartments_per_floor: config.apartmentsPerFloor,
    total_units: config.totalUnits,
    floors: config.floors,
    updated_at: new Date().toISOString(),
  });
}

export async function loadBuildingConfig(projectId: string): Promise<BuildingConfig | null> {
  const { data, error } = await supabase
    .from('building_configs')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    address: data.address ?? '',
    totalFloors: data.total_floors,
    basements: data.basements,
    hasLeisure: data.has_leisure,
    hasAtrium: data.has_atrium,
    hasRooftop: data.has_rooftop,
    technicalAreas: data.technical_areas,
    apartmentsPerFloor: data.apartments_per_floor,
    totalUnits: data.total_units,
    floors: data.floors ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function saveFloorExecutions(phases: ConstructionPhase[], projectId: string): Promise<void> {
  const { saveProjectPhases } = await import('./projectStorage');
  await saveProjectPhases(projectId, phases);
}

export async function loadFloorExecutions(projectId: string): Promise<ConstructionPhase[] | null> {
  const { loadProjectPhases } = await import('./projectStorage');
  return loadProjectPhases(projectId);
}
```

> **Atenção:** `saveBuildingConfig` e `loadBuildingConfig` agora exigem `projectId` como segundo parâmetro. Atualize todos os lugares que chamam essas funções para passar o projectId.

- [ ] **Step 2: Substituir todo o conteúdo de `src/context/ConstructionContext.tsx`**

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ConstructionPhase, SubStep, Status } from '../types';
import { calculatePhaseProgress } from '../lib/constructionPhasesMock';
import { saveProjectPhases, loadProjectPhases } from '../lib/projectStorage';

interface ConstructionContextType {
  phases: ConstructionPhase[];
  setPhases: React.Dispatch<React.SetStateAction<ConstructionPhase[]>>;
  updatePhase: (phaseId: string, data: Partial<ConstructionPhase>) => void;
  updateSubStep: (phaseId: string, subStepId: string, data: Partial<SubStep>) => void;
  addSubStep: (phaseId: string, subStep: Omit<SubStep, 'id'>) => void;
  removeSubStep: (phaseId: string, subStepId: string) => void;
  reorderSubSteps: (phaseId: string, fromIndex: number, toIndex: number) => void;
  addPhase: (phase: Omit<ConstructionPhase, 'id'>) => void;
  removePhase: (phaseId: string) => void;
  calculateOverallProgress: () => number;
  resetToDefault: () => void;
  editingPhaseId: string | null;
  setEditingPhaseId: (id: string | null) => void;
  projectId: string | null;
  setProjectId: (id: string) => void;
}

const ConstructionContext = createContext<ConstructionContextType | undefined>(undefined);

export function ConstructionProvider({ children }: { children: ReactNode }) {
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [projectId, setProjectIdState] = useState<string | null>(null);

  const setProjectId = useCallback((id: string) => {
    setProjectIdState(id);
    setIsInitialized(false);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    loadProjectPhases(projectId).then(loaded => {
      setPhases(loaded && loaded.length > 0 ? loaded : []);
      setIsInitialized(true);
    });
  }, [projectId]);

  useEffect(() => {
    if (!isInitialized || !projectId) return;
    saveProjectPhases(projectId, phases);
  }, [phases, isInitialized, projectId]);

  const recalculatePhaseProgress = useCallback((phase: ConstructionPhase): number => {
    return calculatePhaseProgress(phase);
  }, []);

  const recalculateAllPhases = useCallback((allPhases: ConstructionPhase[]): ConstructionPhase[] => {
    return allPhases.map(phase => ({
      ...phase,
      progress: recalculatePhaseProgress(phase),
      status: calculatePhaseStatus(phase),
    }));
  }, [recalculatePhaseProgress]);

  const updatePhase = useCallback((phaseId: string, data: Partial<ConstructionPhase>) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedPhase = { ...phase, ...data };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const updateSubStep = useCallback((phaseId: string, subStepId: string, data: Partial<SubStep>) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedSubSteps = phase.subSteps.map(s => s.id === subStepId ? { ...s, ...data } : s);
        const updatedPhase = { ...phase, subSteps: updatedSubSteps };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const addSubStep = useCallback((phaseId: string, newSubStep: Omit<SubStep, 'id'>) => {
    const subStep: SubStep = { ...newSubStep, id: `s${phaseId.replace('p', '')}_${Date.now()}` };
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedPhase = { ...phase, subSteps: [...phase.subSteps, subStep] };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const removeSubStep = useCallback((phaseId: string, subStepId: string) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedPhase = { ...phase, subSteps: phase.subSteps.filter(s => s.id !== subStepId) };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const reorderSubSteps = useCallback((phaseId: string, fromIndex: number, toIndex: number) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const newSubSteps = [...phase.subSteps];
        const [removed] = newSubSteps.splice(fromIndex, 1);
        newSubSteps.splice(toIndex, 0, removed);
        const updatedPhase = { ...phase, subSteps: newSubSteps };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const calculateOverallProgress = useCallback((): number => {
    if (phases.length === 0) return 0;
    const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = phases.reduce((sum, p) => sum + (p.progress * p.weight) / 100, 0);
    return Math.round((weightedSum / totalWeight) * 100);
  }, [phases]);

  const resetToDefault = useCallback(() => {
    if (projectId) saveProjectPhases(projectId, []);
    setPhases([]);
  }, [projectId]);

  const addPhase = useCallback((newPhase: Omit<ConstructionPhase, 'id'>) => {
    setPhases(prev => [...prev, { ...newPhase, id: `p_${Date.now()}` }]);
  }, []);

  const removePhase = useCallback((phaseId: string) => {
    setPhases(prev => prev.filter(p => p.id !== phaseId));
  }, []);

  return (
    <ConstructionContext.Provider value={{
      phases, setPhases,
      updatePhase, updateSubStep, addSubStep, removeSubStep,
      reorderSubSteps, addPhase, removePhase,
      calculateOverallProgress, resetToDefault,
      editingPhaseId, setEditingPhaseId,
      projectId, setProjectId,
    }}>
      {children}
    </ConstructionContext.Provider>
  );
}

export function useConstruction() {
  const context = useContext(ConstructionContext);
  if (!context) throw new Error('useConstruction must be used within ConstructionProvider');
  return context;
}

function calculatePhaseStatus(phase: ConstructionPhase): Status {
  const progress = calculatePhaseProgress(phase);
  if (progress === 0) return 'NOT_STARTED';
  if (progress === 100) return 'COMPLETED';
  if (phase.status === 'BLOCKED') return 'BLOCKED';
  if (phase.status !== 'COMPLETED' && new Date() > new Date(phase.endDate)) return 'DELAYED';
  return 'IN_PROGRESS';
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/buildingStorage.ts src/context/ConstructionContext.tsx
git commit -m "feat: migrate buildingStorage and ConstructionContext to supabase"
```

---

### Task 5: Migrar componentes de Team

**Files:**
- Modify: `src/components/team/AddMemberModal.tsx`
- Modify: `src/components/team/TeamPage.tsx`
- Modify: `src/components/team/LoginPage.tsx`

- [ ] **Step 1: Substituir todo o conteúdo de `src/components/team/AddMemberModal.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TeamMember, DEFAULT_PERMISSIONS } from '@/types/plans';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  companyId: string;
  onSuccess?: () => void;
}

async function createMemberInSupabase(
  name: string,
  email: string,
  password: string,
  ownerId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role: 'VIEWER', company_id: companyId },
    email_confirm: true,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Erro ao criar usuário' };
  }

  const { error: memberError } = await supabase.from('team_members').insert({
    id: data.user.id,
    owner_id: ownerId,
    company_id: companyId,
    name,
    email,
    permissions: DEFAULT_PERMISSIONS,
    is_active: true,
  });

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  return { success: true };
}

export default function AddMemberModal({ isOpen, onClose, ownerId, companyId, onSuccess }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const result = await createMemberInSupabase(name.trim(), email.trim().toLowerCase(), password, ownerId, companyId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Erro ao criar acesso');
      return;
    }
    setSuccess(`Acesso criado para ${name}`);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setSuccess('');
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-card p-8 rounded-[40px] max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">Novo Acesso</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">Nome completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="João Silva"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">Senha de acesso</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">Confirmar senha</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {success && <div className="flex items-center gap-2 text-green-400"><Check size={18} /><span className="text-sm">{success}</span></div>}
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 text-slate-500 hover:text-white">Cancelar</button>
          <button onClick={handleSubmit} disabled={!!success || loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar Acesso'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Substituir as funções localStorage em `src/components/team/TeamPage.tsx`**

Substitua as funções `loadMembers`, `saveMembers`, `removeFromCredentials` e o `useEffect` por chamadas Supabase. Mantenha toda a UI intacta. Adicione `companyId` às props:

```typescript
// Substitua as funções de storage no topo do arquivo por:
import { supabase } from '@/lib/supabase';

// Na interface TeamPageProps, adicione companyId:
interface TeamPageProps {
  ownerId?: string;
  companyId?: string;
  plan?: PlanType;
}

// No componente, substitua o useEffect e funções de CRUD:
export default function TeamPage({ ownerId = 'default', companyId = '', plan = 'GOLD' }: TeamPageProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  // ... demais estados

  const loadMembers = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('company_id', companyId);
    if (!error && data) setMembers(data as unknown as TeamMember[]);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, [companyId]);

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member || !confirm(`Remover ${member.name}?`)) return;
    await supabase.auth.admin.deleteUser(memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    showToast('Membro removido');
  };

  const handleSavePermissions = async (memberId: string, permissions: Record<AppModule, AccessLevel>) => {
    await supabase.from('team_members').update({ permissions }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, permissions } : m));
    showToast('Permissões salvas');
  };

  const handleAddMember = () => {
    loadMembers();
    setShowAddModal(false);
    showToast('✅ Acesso criado');
  };
```

Atualize o `<AddMemberModal>` para passar `companyId`:
```typescript
<AddMemberModal
  isOpen={showAddModal}
  onClose={() => setShowAddModal(false)}
  ownerId={ownerId}
  companyId={companyId}
  onSuccess={handleAddMember}
/>
```

- [ ] **Step 3: Substituir autenticação em `src/components/team/LoginPage.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LoginPageProps {
  onLogin: (member: { id: string; name: string; email: string; permissions: any }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Preencha email e senha');
      return;
    }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError || !data.user) {
      setError('Email ou senha incorretos');
      return;
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, name, email, permissions')
      .eq('id', data.user.id)
      .single();

    if (!member) {
      setError('Usuário sem acesso à equipe');
      return;
    }

    onLogin(member);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-[40px] max-w-sm w-full space-y-6">
        <h2 className="text-2xl font-black text-white text-center">Entrar</h2>
        <div className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/team/
git commit -m "feat: migrate team components to supabase auth"
```

---

### Task 6: Migrar `MedicaoObraSection.tsx` e `PendenciasSection.tsx`

**Files:**
- Modify: `src/components/team/MedicaoObraSection.tsx`
- Modify: `src/components/team/PendenciasSection.tsx`

- [ ] **Step 1: Substituir funções localStorage em `MedicaoObraSection.tsx`**

No topo do arquivo, adicione o import e remova `MEDICOES_KEY`, `loadMedicoes` e `saveMedicoes`:

```typescript
import { supabase } from '@/lib/supabase';

async function fetchMedicoes(projectId: string): Promise<Medicao[]> {
  const { data, error } = await supabase
    .from('medicoes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    disciplina: r.disciplina,
    contratante: r.contratante ?? '',
    descricao: r.descricao,
    quantidade: r.quantidade,
    unidade: r.unidade ?? '',
    valorUnitario: r.valor_unitario,
    valorTotal: r.valor_total,
    createdAt: r.created_at,
    createdBy: r.created_by ?? '',
  }));
}
```

Substitua o `useEffect` de carregamento:
```typescript
useEffect(() => {
  fetchMedicoes(projectId).then(setMedicoes);
}, [projectId]);
```

Substitua `adicionarMedicao`:
```typescript
const adicionarMedicao = async () => {
  if (!form.disciplina || !form.descricao || !form.quantidade || !form.valorUnitario) return;
  const quantidade = parseFloat(form.quantidade.replace(',', '.'));
  const valorUnitario = parseFloat(form.valorUnitario.replace(',', '.'));
  const { data, error } = await supabase.from('medicoes').insert({
    project_id: projectId,
    disciplina: form.disciplina,
    contratante: form.contratante,
    descricao: form.descricao,
    quantidade,
    unidade: form.unidade,
    valor_unitario: valorUnitario,
    valor_total: quantidade * valorUnitario,
    created_by: currentUserName,
  }).select().single();
  if (error || !data) return;
  setMedicoes(prev => [...prev, {
    id: data.id, projectId: data.project_id, disciplina: data.disciplina,
    contratante: data.contratante ?? '', descricao: data.descricao,
    quantidade: data.quantidade, unidade: data.unidade ?? '',
    valorUnitario: data.valor_unitario, valorTotal: data.valor_total,
    createdAt: data.created_at, createdBy: data.created_by ?? '',
  }]);
  resetForm();
  setShowAdd(false);
};
```

Substitua `removerMedicao`:
```typescript
const removerMedicao = async (id: string) => {
  if (!confirm('Remover esta medição?')) return;
  await supabase.from('medicoes').delete().eq('id', id);
  setMedicoes(prev => prev.filter(m => m.id !== id));
};
```

Dentro de `handleCSVUpload`, substitua `saveMedicoes(projectId, updated)` por:
```typescript
const inserts = newMedicoes.map(m => ({
  project_id: m.projectId,
  disciplina: m.disciplina,
  contratante: m.contratante,
  descricao: m.descricao,
  quantidade: m.quantidade,
  unidade: m.unidade,
  valor_unitario: m.valorUnitario,
  valor_total: m.valorTotal,
  created_by: m.createdBy,
}));
await supabase.from('medicoes').insert(inserts);
const refreshed = await fetchMedicoes(projectId);
setMedicoes(refreshed);
alert(`${newMedicoes.length} medições importadas!`);
```

- [ ] **Step 2: Substituir funções localStorage em `PendenciasSection.tsx`**

Adicione import e remova `PENDENCIAS_KEY`, `loadPendencias` e `savePendencias`:

```typescript
import { supabase } from '@/lib/supabase';

async function fetchPendencias(projectId: string): Promise<Pendencia[]> {
  const { data, error } = await supabase
    .from('pendencias')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    conteudo: r.conteudo,
    responsavel: r.responsavel ?? '',
    nomeMembro: r.nome_membro ?? '',
    createdAt: r.created_at,
    concluida: r.concluida,
    concluidaPor: r.concluida_por,
    concluidaEm: r.concluida_em,
  }));
}
```

Substitua o `useEffect`:
```typescript
useEffect(() => {
  fetchPendencias(projectId).then(setPendencias);
}, [projectId]);
```

Substitua `adicionarPendencia`:
```typescript
const adicionarPendencia = async () => {
  if (!novaPendencia.trim()) return;
  const { data, error } = await supabase.from('pendencias').insert({
    project_id: projectId,
    conteudo: novaPendencia.trim(),
    responsavel: responsavel.trim() || currentUserName,
    nome_membro: currentUserName,
    concluida: false,
  }).select().single();
  if (error || !data) return;
  setPendencias(prev => [...prev, {
    id: data.id, projectId: data.project_id, conteudo: data.conteudo,
    responsavel: data.responsavel ?? '', nomeMembro: data.nome_membro ?? '',
    createdAt: data.created_at, concluida: data.concluida,
  }]);
  setNovaPendencia('');
  setResponsavel('');
  setShowAdd(false);
};
```

Substitua `toggleConcluida`:
```typescript
const toggleConcluida = async (id: string) => {
  const p = pendencias.find(p => p.id === id);
  if (!p) return;
  const novaConcluida = !p.concluida;
  await supabase.from('pendencias').update({
    concluida: novaConcluida,
    concluida_por: novaConcluida ? currentUserName : null,
    concluida_em: novaConcluida ? new Date().toISOString() : null,
  }).eq('id', id);
  setPendencias(prev => prev.map(item => item.id !== id ? item : {
    ...item,
    concluida: novaConcluida,
    concluidaPor: novaConcluida ? currentUserName : undefined,
    concluidaEm: novaConcluida ? new Date().toISOString() : undefined,
  }));
};
```

Substitua `removerPendencia`:
```typescript
const removerPendencia = async (id: string) => {
  if (!confirm('Remover esta pendência?')) return;
  await supabase.from('pendencias').delete().eq('id', id);
  setPendencias(prev => prev.filter(p => p.id !== id));
};
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/team/MedicaoObraSection.tsx src/components/team/PendenciasSection.tsx
git commit -m "feat: migrate medicoes and pendencias to supabase"
```

---

### Task 7: Limpeza Final e Verificação

**Files:**
- Verify: todos os arquivos `src/`

- [ ] **Step 1: Buscar qualquer localStorage restante**

```bash
grep -r "localStorage" src/ --include="*.ts" --include="*.tsx" -l
```

Para cada arquivo listado, substitua chamadas localStorage por Supabase seguindo os padrões das tasks anteriores.

- [ ] **Step 2: Buscar qualquer sessionStorage restante**

```bash
grep -r "sessionStorage" src/ --include="*.ts" --include="*.tsx" -l
```

Substitua `sessionStorage.setItem('current_member', ...)` por estado em memória ou pelo contexto de auth do Supabase (`supabase.auth.getUser()`).

- [ ] **Step 3: Verificar TypeScript completo**

```bash
npx tsc --noEmit
```

Corrija todos os erros antes de continuar.

- [ ] **Step 4: Testar o fluxo completo manualmente**

Execute `npm run dev` e verifique:
1. Login com `admin@obraflow.com` / `admin123` funciona
2. Criar uma empresa — aparece no Supabase Table Editor
3. Criar um projeto — aparece na tabela `projects`
4. Adicionar fases de construção — aparecem em `project_phases`
5. Adicionar um membro do time — aparece em `auth.users` e `team_members`
6. Login como membro do time em aba anônima ou outro dispositivo
7. Os dados criados no passo 3/4 aparecem no segundo dispositivo

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: complete localStorage to supabase migration - all data now persisted in postgres"
```
