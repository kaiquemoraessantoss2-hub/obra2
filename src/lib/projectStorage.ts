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
    floors: (p.floors ?? []).map((f) => ({
      id: f.id as string,
      number: f.number as number,
      label: f.label as string,
      type: f.type as Floor['type'],
      phase: f.phase as string,
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
