import { BuildingConfig, ConstructionPhase, FloorExecution } from '@/types';

const BUILDING_CONFIG_KEY = 'building_config';
const FLOOR_EXECUTIONS_KEY = 'floor_executions';

export function saveBuildingConfig(config: BuildingConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BUILDING_CONFIG_KEY, JSON.stringify(config));
}

export function loadBuildingConfig(): BuildingConfig | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(BUILDING_CONFIG_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveFloorExecutions(phases: ConstructionPhase[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FLOOR_EXECUTIONS_KEY, JSON.stringify(phases));
}

export function loadFloorExecutions(): ConstructionPhase[] | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(FLOOR_EXECUTIONS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
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