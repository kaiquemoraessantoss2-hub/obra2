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

export function getProgressPercentage(services: any[] | undefined | null) {
  if (!services || services.length === 0) return 0;
  const completed = services.filter(s => s.status === 'COMPLETED').length;
  const inProgress = services.filter(s => s.status === 'IN_PROGRESS').length;
  return Math.round(((completed * 1) + (inProgress * 0.5)) / services.length * 100);
}
