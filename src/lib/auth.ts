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

export interface Company {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  plan?: string;
  monthlyValue?: number;
  planStartDate?: string;
  planEndDate?: string;
  billingStatus?: string;
  isPaused?: boolean;
  activeUsers?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  location?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  totalFloors?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  companyId?: string;
  company_id?: string;
  createdAt?: string;
  updatedAt?: string;
  basements?: number;
  hasLeisure?: boolean;
  hasAtrium?: boolean;
  technicalAreas?: number;
  floors?: any[];
  phases?: any[];
}

export interface TeamMember {
  id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
  company_id?: string;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  date?: string;
  type: string;
  description?: string;
  projectId?: string;
  company_id?: string;
  day?: number;
  time?: string;
  status?: 'PENDING' | 'COMPLETED';
}

export interface Gargalo {
  id?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt?: string;
  company_id?: string;
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
    .maybeSingle();

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
    .maybeSingle();

  if (!profile) return null;

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return null;
  }

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
  // Tenta primeiro o endpoint admin (com emails reais via service-role).
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const role = session?.user?.user_metadata?.role;
    
    // Só tenta o fetch se tiver token e se for ADMIN/SUPERADMIN para evitar 403 no console
    if (token && (role === 'ADMIN' || role === 'SUPERADMIN')) {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users)) {
          // Cruza com profiles para obter is_active e role atualizados.
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, role, company_id, is_active');
          const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
          return json.users.map((u: any) => {
            const p: any = byId.get(u.id) || {};
            return {
              id: u.id,
              email: u.email || '',
              name: p.name || u.name || u.email || '',
              role: (p.role || u.role || 'ADMIN') as StoredUser['role'],
              companyId: p.company_id || u.companyId || '',
              isActive: p.is_active !== false,
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('getAllUsers: fallback para profiles, erro:', err);
  }

  // Fallback: só profiles (sem email real).
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, company_id, is_active');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return (data || []).map(p => ({
    id: p.id,
    email: '',
    name: p.name || '',
    role: (p.role || 'ADMIN') as StoredUser['role'],
    companyId: p.company_id || '',
    isActive: p.is_active !== false,
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
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error('updateUserActive: sem sessão ativa');
      return false;
    }

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, isActive })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('updateUserActive falhou:', res.status, data);
      return false;
    }
    return data.success === true;
  } catch (error) {
    console.error('Error updating user active:', error);
    return false;
  }
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

export async function loadCompanies(): Promise<Company[]> {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) {
    console.error('loadCompanies error:', error);
    return [];
  }
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    plan: c.plan,
    monthlyValue: typeof c.monthly_value === 'string' ? parseFloat(c.monthly_value) : c.monthly_value,
    planStartDate: c.plan_start_date,
    planEndDate: c.plan_end_date,
    billingStatus: c.billing_status,
    isPaused: c.is_paused,
    activeUsers: c.active_users,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

export async function saveCompany(company: Company): Promise<{ ok: boolean; error?: string }> {
  const record: any = {
    name: company.name,
    email: company.email,
    phone: company.phone,
    address: company.address,
    plan: company.plan,
    monthly_value: company.monthlyValue,
    plan_start_date: company.planStartDate,
    plan_end_date: company.planEndDate,
    billing_status: company.billingStatus,
    is_paused: company.isPaused,
    active_users: company.activeUsers,
  };
  Object.keys(record).forEach(k => record[k] === undefined && delete record[k]);

  if (company.id) {
    const { error } = await supabase
      .from('companies')
      .update(record)
      .eq('id', company.id);
    if (error) {
      console.error('saveCompany update error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } else {
    const { error } = await supabase.from('companies').insert(record);
    if (error) {
      console.error('saveCompany insert error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }
}

export async function saveCompanies(companies: Company[]): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const company of companies) {
    const result = await saveCompany(company);
    if (!result.ok && result.error) errors.push(`${company.name}: ${result.error}`);
  }
  return { ok: errors.length === 0, errors };
}

export async function deleteCompany(companyId: string): Promise<boolean> {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  return !error;
}

// =====================
// PROJECTS
// =====================

export async function loadProjects(companyId?: string): Promise<Project[]> {
  let query = supabase.from('projects').select(`
    *,
    floors (
      *,
      services (*)
    ),
    project_phases (*)
  `);
  
  if (companyId && companyId.trim() !== '') {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Error loading projects:', error);
    return [];
  }
  
  console.log(`Loaded ${data?.length || 0} projects`);

  return (data ?? []).map(p => ({
    ...p,
    companyId: p.company_id,
    totalFloors: p.total_floors,
    hasLeisure: p.has_leisure,
    hasAtrium: p.has_atrium,
    technicalAreas: p.technical_areas,
    phases: (p.project_phases || []).map((ph: any) => ({
      ...ph,
      startDate: ph.start_date,
      endDate: ph.end_date,
      actualStartDate: ph.actual_start_date,
      actualEndDate: ph.actual_end_date,
      dependsOn: ph.depends_on,
      subSteps: ph.sub_steps,
      sortOrder: ph.sort_order
    })).sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    floors: (p.floors || []).map((f: any) => ({
      ...f,
      projectId: f.project_id,
      services: (f.services || []).map((s: any) => ({
        ...s,
        floorId: s.floor_id
      }))
    })).sort((a: any, b: any) => a.number - b.number)
  })) as Project[];
}

export async function saveProject(project: Project): Promise<void> {
  const { id, companyId, company_id, floors, phases, ...rest } = project;
  const company_id_final = companyId ?? company_id;
  
  if (!id) return;

  const record = { 
    id,
    name: rest.name,
    location: rest.location,
    total_floors: rest.totalFloors,
    basements: rest.basements,
    has_leisure: rest.hasLeisure,
    has_atrium: rest.hasAtrium,
    technical_areas: rest.technicalAreas,
    company_id: company_id_final,
    updated_at: new Date().toISOString()
  };

  const { error: upsertError } = await supabase.from('projects').upsert(record);
  
  if (upsertError) {
    console.error('Error saving project:', upsertError);
    return;
  }

  // Sincronizar pavimentos
  if (floors && floors.length > 0) {
    const { error: floorsError } = await supabase.from('floors').upsert(
      floors.map(f => ({
        id: f.id, 
        project_id: id,
        number: f.number,
        label: f.label,
        type: f.type,
        phase: f.phase,
      }))
    );
    if (floorsError) console.error('Error saving floors:', floorsError);

    // Sincronizar serviços de cada pavimento
    for (const f of floors) {
      if (f.services && f.services.length > 0) {
        const { error: servicesError } = await supabase.from('services').upsert(
          f.services.map((s: any) => ({
            id: s.id,
            floor_id: f.id,
            name: s.name,
            status: s.status
          }))
        );
        if (servicesError) console.error('Error saving services:', servicesError);
      }
    }
  }

  // Sincronizar fases (Cronograma)
  if (phases && phases.length > 0) {
    const { error: phasesError } = await supabase.from('project_phases').upsert(
      phases.map((ph, index) => ({
        id: ph.id, 
        project_id: id,
        name: ph.name,
        icon: ph.icon,
        color: ph.color,
        progress: ph.progress,
        status: ph.status,
        weight: ph.weight,
        start_date: ph.startDate || null,
        end_date: ph.endDate || null,
        actual_start_date: ph.actualStartDate || null,
        actual_end_date: ph.actualEndDate || null,
        responsible: ph.responsible,
        observations: ph.observations,
        depends_on: ph.dependsOn ?? [],
        approved_by: ph.approvedBy,
        approved_at: ph.approvedAt || null,
        blocked_reason: ph.blockedReason,
        sub_steps: ph.subSteps,
        history: ph.history ?? [],
        sort_order: index,
        updated_at: new Date().toISOString()
      }))
    );
    if (phasesError) console.error('Error saving phases:', phasesError);
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  // Use Promise.all for better performance, but ensure they don't conflict
  await Promise.all(projects.map(p => saveProject(p)));
}

export async function deleteProjectsByCompany(companyId: string): Promise<boolean> {
  const { error } = await supabase.from('projects').delete().eq('company_id', companyId);
  return !error;
}

// =====================
// TEAM
// =====================

export async function loadTeamByCompany(companyId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('company_id', companyId);
  if (error) return [];
  return data ?? [];
}

export async function saveTeamByCompany(companyId: string, team: TeamMember[]): Promise<void> {
  for (const member of team) {
    await supabase.from('team_members').upsert({ ...member, company_id: companyId });
  }
}

// =====================
// CALENDAR
// =====================

export async function loadCalendarEvents(companyId: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('company_id', companyId)
    .order('date', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function saveCalendarEvents(companyId: string, events: CalendarEvent[]): Promise<void> {
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
