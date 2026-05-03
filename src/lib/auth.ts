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

export async function loadCompanies(): Promise<Company[]> {
  const { data, error } = await supabase.from('companies').select('*');
  if (error) return [];
  return data ?? [];
}

export async function saveCompany(company: Company): Promise<void> {
  const { id, ...rest } = company;
  if (id) {
    await supabase.from('companies').upsert({ id, ...rest });
  } else {
    await supabase.from('companies').insert(rest);
  }
}

export async function saveCompanies(companies: Company[]): Promise<void> {
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

export async function loadProjects(companyId?: string): Promise<Project[]> {
  let query = supabase.from('projects').select('*, floors(*)');
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) {
    console.error('Error loading projects:', error);
    return [];
  }
  
  return (data ?? []).map(p => ({
    ...p,
    companyId: p.company_id,
    totalFloors: p.total_floors,
    hasLeisure: p.has_leisure,
    hasAtrium: p.has_atrium,
    technicalAreas: p.technical_areas,
    // Map nested floors to camelCase if needed
    floors: (p.floors || []).map((f: any) => ({
      ...f,
      projectId: f.project_id
    }))
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
    // Para simplificar, deletamos e inserimos novamente
    await supabase.from('floors').delete().eq('project_id', id);
    await supabase.from('floors').insert(
      floors.map(f => ({
        id: f.id,
        project_id: id,
        number: f.number,
        label: f.label,
        type: f.type,
        phase: f.phase,
      }))
    );
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
