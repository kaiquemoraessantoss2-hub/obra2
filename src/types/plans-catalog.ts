import type { AppModule, AccessLevel } from './plans';

export interface Plan {
  id: string;
  name: string;
  monthlyValue: number;
  maxMembers: number;
  modules: Record<AppModule, AccessLevel>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PlanInput = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
