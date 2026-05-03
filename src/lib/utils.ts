import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'bg-emerald-500';
    case 'IN_PROGRESS': return 'bg-blue-500';
    default: return 'bg-slate-700';
  }
}

import { Service } from '@/types';

export function getProgressPercentage(services: Service[] | undefined | null) {
  if (!services || services.length === 0) return 0;
  const completed = services.filter(s => s.status === 'COMPLETED').length;
  const inProgress = services.filter(s => s.status === 'IN_PROGRESS').length;
  return Math.round(((completed * 1) + (inProgress * 0.5)) / services.length * 100);
}

// Gera um UUID v4 válido — necessário porque as tabelas Postgres
// (projects, floors, project_phases) usam `uuid` como chave primária.
// Strings tipo `p_${Date.now()}` são rejeitadas pelo banco.
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  // Fallback para ambientes sem crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
