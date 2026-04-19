export type Status = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'BLOCKED';
export type Phase = 'Structure' | 'Masonry' | 'Finishing' | 'Finalization' | 'Hydraulic' | 'Electrical';
export type FloorType = 'REGULAR' | 'BASEMENT' | 'GROUND' | 'LEISURE' | 'TECHNICAL' | 'ATRIUM' | 'ROOFTOP';
export type BillingStatus = 'ACTIVE' | 'OVERDUE' | 'TRIAL';

export interface Service {
  id: string;
  name: string;
  status: Status;
}

export interface Attachment {
  url: string;
  label: string;
  type: 'image' | 'doc';
}

export interface HistoryEntry {
  date: string;
  note: string;
  author: string;
}

export interface FloorExecutionHistory {
  id: string;
  changedAt: string;
  changedBy: string;
  field: string;
  oldValue: string;
  newValue: string;
  note?: string;
}

export interface FloorExecution {
  floorId: string;
  floorLabel: string;
  status: Status;
  progress: number;
  startDate?: string;
  endDate?: string;
  observations?: string;
  measuredQuantity?: number;
  totalQuantity?: number;
  unit?: string;
  measuredBy?: string;
  measuredAt?: string;
  history?: FloorExecutionHistory[];
}

export interface BuildingConfig {
  id: string;
  name: string;
  address: string;
  totalFloors: number;
  basements: number;
  hasLeisure: boolean;
  hasAtrium: boolean;
  hasRooftop: boolean;
  technicalAreas: number;
  apartmentsPerFloor: number;
  totalUnits: number;
  floors: Floor[];
  createdAt: string;
  updatedAt: string;
}

export interface SubStep {
  id: string;
  name: string;
  status: Status;
  progress: number;
  observations?: string;
  responsible?: string;
  attachments?: Attachment[];
  history?: HistoryEntry[];
  hasFloorBreakdown: boolean;
  floorExecutions?: FloorExecution[];
  estimatedQuantity?: number;
  unit?: string;
}

export interface ConstructionPhase {
  id: string;
  name: string;
  icon: string;
  color: string;
  progress: number;
  status: Status;
  weight: number;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  actualStartDate?: string;
  responsible: string;
  observations?: string;
  subSteps: SubStep[];
  dependsOn?: string[];
  approvedBy?: string;
  approvedAt?: string;
  blockedReason?: string;
  history?: HistoryEntry[];
}

export interface Floor {
  id: string;
  number: number;
  label: string;
  type: 'BASEMENT' | 'GROUND' | 'REGULAR' | 'ROOFTOP' | 'TECHNICAL' | 'LEISURE' | 'ATRIUM';
  phase: string;
  services: Service[];
  photos?: string[];
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  location: string;
  totalFloors: number;
  basements: number;
  hasLeisure: boolean;
  hasAtrium: boolean;
  technicalAreas: number;
  floors: Floor[];
  phases?: ConstructionPhase[];
}

export interface Company {
  id: string;
  name: string;
  plan: 'Básico' | 'Pro' | 'Empresa';
  monthlyValue: number;
  planStartDate: string;
  planEndDate: string;
  billingStatus: 'ACTIVE' | 'OVERDUE' | 'SUSPENDED' | 'EXPIRED';
  isPaused: boolean;
  activeUsers: number;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ENGINEER' | 'ADMIN' | 'VIEWER';
  avatar?: string;
}

export const FLOOR_ORDER: Record<FloorType, number> = {
  BASEMENT: -1,
  GROUND: 0,
  REGULAR: 1,
  LEISURE: 100,
  TECHNICAL: 200,
  ATRIUM: 50,
  ROOFTOP: 250,
};
