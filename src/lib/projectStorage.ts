import { Project, ConstructionPhase, BuildingConfig } from '@/types';

function getKey(projectId: string, suffix: string): string {
  return `project_${projectId}_${suffix}`;
}

export function saveProjectData(project: Project): void {
  if (typeof window === 'undefined' || !project.id) return;
  localStorage.setItem(getKey(project.id, 'data'), JSON.stringify(project));
}

export function loadProjectData(projectId: string): Project | null {
  if (typeof window === 'undefined' || !projectId) return null;
  const stored = localStorage.getItem(getKey(projectId, 'data'));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function deleteProjectData(projectId: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.removeItem(getKey(projectId, 'data'));
  localStorage.removeItem(getKey(projectId, 'phases'));
  localStorage.removeItem(getKey(projectId, 'config'));
  localStorage.removeItem(getKey(projectId, 'executions'));
}

export function saveProjectPhases(projectId: string, phases: ConstructionPhase[]): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.setItem(getKey(projectId, 'phases'), JSON.stringify(phases));
}

export function loadProjectPhases(projectId: string): ConstructionPhase[] | null {
  if (typeof window === 'undefined' || !projectId) return null;
  const stored = localStorage.getItem(getKey(projectId, 'phases'));
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function removeProjectPhases(projectId: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.removeItem(getKey(projectId, 'phases'));
}

export function saveProjectConfig(projectId: string, config: BuildingConfig): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.setItem(getKey(projectId, 'config'), JSON.stringify(config));
}

export function loadProjectConfig(projectId: string): BuildingConfig | null {
  if (typeof window === 'undefined' || !projectId) return null;
  const stored = localStorage.getItem(getKey(projectId, 'config'));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function removeProjectConfig(projectId: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.removeItem(getKey(projectId, 'config'));
}

export function saveProjectExecutions(projectId: string, phases: ConstructionPhase[]): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.setItem(getKey(projectId, 'executions'), JSON.stringify(phases));
}

export function loadProjectExecutions(projectId: string): ConstructionPhase[] | null {
  if (typeof window === 'undefined' || !projectId) return null;
  const stored = localStorage.getItem(getKey(projectId, 'executions'));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function removeProjectExecutions(projectId: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  localStorage.removeItem(getKey(projectId, 'executions'));
}