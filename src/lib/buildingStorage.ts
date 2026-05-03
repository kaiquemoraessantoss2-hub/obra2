import { BuildingConfig, ConstructionPhase, FloorExecution } from '@/types';
import { supabase } from './supabase';

export async function saveBuildingConfig(config: BuildingConfig, projectId: string): Promise<void> {
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

export async function loadBuildingConfig(projectId: string): Promise<BuildingConfig | null> {
  const { data, error } = await supabase
    .from('building_configs')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

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

export async function saveFloorExecutions(phases: ConstructionPhase[], projectId: string): Promise<void> {
  const { saveProjectPhases } = await import('./projectStorage');
  await saveProjectPhases(projectId, phases);
}

export async function loadFloorExecutions(projectId: string): Promise<ConstructionPhase[] | null> {
  const { loadProjectPhases } = await import('./projectStorage');
  return loadProjectPhases(projectId);
}

export function recalculateSubStepProgress(subStep: ConstructionPhase['subSteps'][0]): number {
  if (!subStep.hasFloorBreakdown || !subStep.floorExecutions || subStep.floorExecutions.length === 0) {
    return subStep.progress;
  }

  const totalProgress = subStep.floorExecutions.reduce((sum, fe) => sum + fe.progress, 0);
  return Math.round(totalProgress / subStep.floorExecutions.length);
}

export function recalculatePhaseProgress(phase: ConstructionPhase): number {
  if (!phase.subSteps || phase.subSteps.length === 0) {
    return phase.progress;
  }

  const totalProgress = phase.subSteps.reduce((sum, subStep) => {
    return sum + recalculateSubStepProgress(subStep);
  }, 0);

  return Math.round(totalProgress / phase.subSteps.length);
}

export function updateFloorExecutionInPhase(
  phases: ConstructionPhase[],
  phaseId: string,
  subStepId: string,
  floorId: string,
  data: Partial<FloorExecution>
): ConstructionPhase[] {
  return phases.map(phase => {
    if (phase.id !== phaseId) return phase;

    return {
      ...phase,
      subSteps: phase.subSteps.map(subStep => {
        if (subStep.id !== subStepId) return subStep;

        if (!subStep.hasFloorBreakdown) return subStep;

        const updatedExecutions = subStep.floorExecutions?.map(fe => {
          if (fe.floorId !== floorId) return fe;
          return { ...fe, ...data };
        }) || [];

        const recalculatedProgress = recalculateSubStepProgress({
          ...subStep,
          floorExecutions: updatedExecutions
        });

        return {
          ...subStep,
          floorExecutions: updatedExecutions,
          progress: recalculatedProgress,
          status: recalculatedProgress === 100 ? 'COMPLETED' :
                  recalculatedProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
        };
      }),
      progress: recalculatePhaseProgress({
        ...phase,
        subSteps: phase.subSteps.map(subStep => {
          if (subStep.id !== subStepId) return subStep;
          if (!subStep.hasFloorBreakdown) return subStep;

          const updatedExecutions = subStep.floorExecutions?.map(fe => {
            if (fe.floorId !== floorId) return fe;
            return { ...fe, ...data };
          }) || [];

          return {
            ...subStep,
            floorExecutions: updatedExecutions,
            progress: recalculateSubStepProgress({
              ...subStep,
              floorExecutions: updatedExecutions
            })
          };
        })
      })
    };
  });
}

export function bulkUpdateFloorExecutions(
  phases: ConstructionPhase[],
  phaseId: string,
  subStepId: string,
  floorIds: string[],
  status: FloorExecution['status'],
  progress: number
): ConstructionPhase[] {
  return phases.map(phase => {
    if (phase.id !== phaseId) return phase;

    return {
      ...phase,
      subSteps: phase.subSteps.map(subStep => {
        if (subStep.id !== subStepId) return subStep;
        if (!subStep.hasFloorBreakdown) return subStep;

        const updatedExecutions = subStep.floorExecutions?.map(fe => {
          if (!floorIds.includes(fe.floorId)) return fe;
          return { ...fe, status, progress };
        }) || [];

        return {
          ...subStep,
          floorExecutions: updatedExecutions,
          progress: recalculateSubStepProgress({
            ...subStep,
            floorExecutions: updatedExecutions
          }),
          status: (() => {
            const avgProgress = recalculateSubStepProgress({
              ...subStep,
              floorExecutions: updatedExecutions
            });
            return avgProgress === 100 ? 'COMPLETED' :
                   avgProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
          })()
        };
      }),
      progress: recalculatePhaseProgress(phase)
    };
  });
}
