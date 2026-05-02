// ============================================
// TIPOS DE PLANOS E EQUIPE
// ============================================

export type AppModule = 
  | 'DASHBOARD'
  | 'CRONOGRAMA'
  | 'PAVIMENTOS'
  | 'MEDICAO'
  | 'DOCUMENTOS'
  | 'PENDENCIAS'
  | 'MEDICAO_OBRA';

export interface Medicao {
  id: string;
  projectId: string;
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  createdBy: string;
}

export type AccessLevel = 'BLOQUEADO' | 'VER' | 'EDITAR';

export type PlanType = 'BASIC' | 'GOLD' | 'PRO_MAX';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  password?: string;
  isActive: boolean;
  createdAt?: string;
  permissions: Record<AppModule, AccessLevel>;
}

export const PLAN_LIMITS: Record<PlanType, { maxMembers: number; label: string }> = {
  BASIC:   { maxMembers: 0, label: 'Basic' },
  GOLD:    { maxMembers: 3, label: 'Gold' },
  PRO_MAX: { maxMembers: 5, label: 'Pro Max' },
};

export const DEFAULT_PERMISSIONS: Record<AppModule, AccessLevel> = {
  DASHBOARD:   'VER',
  CRONOGRAMA:  'VER',
  PAVIMENTOS: 'BLOQUEADO',
  MEDICAO:    'BLOQUEADO',
  DOCUMENTOS: 'BLOQUEADO',
  PENDENCIAS: 'VER',
  MEDICAO_OBRA: 'VER',
};

export const ALL_MODULES: AppModule[] = [
  'DASHBOARD',
  'CRONOGRAMA',
  'PAVIMENTOS',
  'MEDICAO',
  'DOCUMENTOS',
  'PENDENCIAS',
  'MEDICAO_OBRA',
];

export const MODULE_LABELS: Record<AppModule, string> = {
  DASHBOARD:   'Dashboard',
  CRONOGRAMA:  'Cronograma',
  PAVIMENTOS: 'Pavimentos',
  MEDICAO:     'Medição',
  DOCUMENTOS: 'Documentos',
  PENDENCIAS:  'Pendências',
  MEDICAO_OBRA: 'Medição da Obra',
};

// Re-exports (não criar tipos duplicados)