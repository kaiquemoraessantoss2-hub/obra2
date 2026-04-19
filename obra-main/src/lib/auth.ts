'use client';

import { supabase } from './supabase';

export interface StoredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'ENGINEER' | 'VIEWER';
  companyId: string;
  isActive?: boolean;
}

const USERS_KEY = 'obraflow_users';
const COMPANIES_KEY = 'obraflow_companies';
const PROJECTS_KEY = 'obraflow_projects';
const TEAMS_KEY = 'obraflow_teams';
const CALENDAR_KEY = 'obraflow_calendar';

export function loadTeamByCompany(companyId: string): any[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${TEAMS_KEY}_${companyId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveTeamByCompany(companyId: string, team: any[]): void {
  localStorage.setItem(`${TEAMS_KEY}_${companyId}`, JSON.stringify(team));
}

export function loadCalendarEvents(companyId: string): any[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${CALENDAR_KEY}_${companyId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveCalendarEvents(companyId: string, events: any[]): void {
  localStorage.setItem(`${CALENDAR_KEY}_${companyId}`, JSON.stringify(events));
}

const GARGALOS_KEY = 'obraflow_gargalos';

export function loadGargalosByCompany(companyId: string): any[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`${GARGALOS_KEY}_${companyId}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveGargalosByCompany(companyId: string, gargalos: any[]): void {
  localStorage.setItem(`${GARGALOS_KEY}_${companyId}`, JSON.stringify(gargalos));
}

export function updateUserActive(userId: string, isActive: boolean): boolean {
  try {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      (users[userIndex] as any).isActive = isActive;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function deleteUser(userId: string): boolean {
  try {
    const users = loadUsers();
    const userToDelete = users.find(u => u.id === userId);
    const filteredUsers = users.filter(u => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(filteredUsers));
    
    if (userToDelete) {
      const remainingUsersInCompany = filteredUsers.filter(u => u.companyId === userToDelete.companyId);
      if (remainingUsersInCompany.length === 0) {
        const companies = loadCompanies();
        const filteredCompanies = companies.filter(c => c.id !== userToDelete.companyId);
        localStorage.setItem(COMPANIES_KEY, JSON.stringify(filteredCompanies));
        
        const projects = loadProjects();
        const filteredProjects = projects.filter(p => p.companyId !== userToDelete.companyId);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(filteredProjects));
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function getAllUsers(): StoredUser[] {
  return loadUsers();
}

export const defaultUsers: StoredUser[] = [
  {
    id: 'u_master',
    email: 'admin@obraflow.com',
    password: 'admin123',
    name: 'Kaique (Master)',
    role: 'SUPERADMIN',
    companyId: 'comp_saas'
  }
];

export const defaultCompanies: any[] = [];

export function loadUsers(): StoredUser[] {
  if (typeof window === 'undefined') return defaultUsers;
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultUsers;
    }
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

export function saveUser(user: StoredUser): boolean {
  try {
    const users = loadUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Failed to save user:', error);
    return false;
  }
}

export function validateUser(email: string, password: string): StoredUser | null {
  const users = loadUsers();
  return users.find(u => u.email === email && u.password === password) || null;
}

export function getUserByEmail(email: string): StoredUser | undefined {
  const users = loadUsers();
  return users.find(u => u.email === email);
}

export function loadCompanies(): any[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(COMPANIES_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export async function loadUserProfilesFromSupabase(): Promise<any[]> {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return [];
    const json = await res.json();
    return json.users || [];
  } catch (err) {
    console.error('Erro ao buscar usuários do Auth:', err);
    return [];
  }
}



export function saveCompany(company: any): void {
  const companies = loadCompanies();
  companies.push(company);
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
}

export function loadProjects(): any[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PROJECTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function initializeDefaultData(): void {
  if (typeof window === 'undefined') return;
}

export function saveProject(project: any): void {
  const projects = loadProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function saveProjects(projects: any[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function saveCompanies(companies: any[]): void {
  localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
}

export function updateUserPassword(email: string, newPassword: string): boolean {
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex >= 0) {
    users[userIndex].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  }
  return false;
}

export function deleteCompany(companyId: string): boolean {
  try {
    const companies = loadCompanies();
    const filtered = companies.filter(c => c.id !== companyId);
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function deleteProjectsByCompany(companyId: string): boolean {
  try {
    const projects = loadProjects();
    const filtered = projects.filter(p => p.companyId !== companyId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(COMPANIES_KEY);
  localStorage.removeItem(PROJECTS_KEY);
  localStorage.removeItem(TEAMS_KEY);
  localStorage.removeItem(CALENDAR_KEY);
  localStorage.removeItem(GARGALOS_KEY);
}

export function resetToCleanState(): void {
  if (typeof window === 'undefined') return;
  
  // Keep only the master admin user
  const masterUser = {
    id: 'u_master',
    email: 'admin@obraflow.com',
    password: 'admin123',
    name: 'Kaique (Master)',
    role: 'SUPERADMIN' as const,
    companyId: 'comp_saas',
    isActive: true
  };
  
  localStorage.setItem(USERS_KEY, JSON.stringify([masterUser]));
  localStorage.setItem(COMPANIES_KEY, JSON.stringify([]));
  localStorage.setItem(PROJECTS_KEY, JSON.stringify([]));
  
  // Clear team/calendar/gargalos for any company
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('obraflow_teams_') || key.startsWith('obraflow_calendar_') || key.startsWith('obraflow_gargalos_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}