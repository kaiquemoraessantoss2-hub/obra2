'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ConstructionPhase, SubStep, Status } from '../types';
import { INITIAL_PHASES, calculatePhaseProgress } from '../lib/constructionPhasesMock';

const STORAGE_KEY = 'construction_phases';

interface ConstructionContextType {
  phases: ConstructionPhase[];
  setPhases: React.Dispatch<React.SetStateAction<ConstructionPhase[]>>;
  updatePhase: (phaseId: string, data: Partial<ConstructionPhase>) => void;
  updateSubStep: (phaseId: string, subStepId: string, data: Partial<SubStep>) => void;
  addSubStep: (phaseId: string, subStep: Omit<SubStep, 'id'>) => void;
  removeSubStep: (phaseId: string, subStepId: string) => void;
  reorderSubSteps: (phaseId: string, fromIndex: number, toIndex: number) => void;
  addPhase: (phase: Omit<ConstructionPhase, 'id'>) => void;
  removePhase: (phaseId: string) => void;
  calculateOverallProgress: () => number;
  resetToDefault: () => void;
  editingPhaseId: string | null;
  setEditingPhaseId: (id: string | null) => void;
}

const ConstructionContext = createContext<ConstructionContextType | undefined>(undefined);

export function ConstructionProvider({ children }: { children: ReactNode }) {
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          setPhases(parsed);
        }
      } catch {
        setPhases([]);
      }
    } else {
      setPhases([]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(phases));
    }
  }, [phases, isInitialized]);

  const recalculatePhaseProgress = useCallback((phase: ConstructionPhase): number => {
    return calculatePhaseProgress(phase);
  }, []);

  const recalculateAllPhases = useCallback((allPhases: ConstructionPhase[]): ConstructionPhase[] => {
    return allPhases.map(phase => ({
      ...phase,
      progress: recalculatePhaseProgress(phase),
      status: calculatePhaseStatus(phase),
    }));
  }, [recalculatePhaseProgress]);

  const updatePhase = useCallback((phaseId: string, data: Partial<ConstructionPhase>) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id === phaseId) {
          const updatedPhase = { ...phase, ...data };
          return {
            ...updatedPhase,
            progress: recalculatePhaseProgress(updatedPhase),
            status: calculatePhaseStatus(updatedPhase),
          };
        }
        return phase;
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const updateSubStep = useCallback((phaseId: string, subStepId: string, data: Partial<SubStep>) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id === phaseId) {
          const updatedSubSteps = phase.subSteps.map(subStep => {
            if (subStep.id === subStepId) {
              return { ...subStep, ...data };
            }
            return subStep;
          });
          const updatedPhase = { ...phase, subSteps: updatedSubSteps };
          return {
            ...updatedPhase,
            progress: recalculatePhaseProgress(updatedPhase),
            status: calculatePhaseStatus(updatedPhase),
          };
        }
        return phase;
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const addSubStep = useCallback((phaseId: string, newSubStep: Omit<SubStep, 'id'>) => {
    const subStepId = `s${phaseId.replace('p', '')}_${Date.now()}`;
    const subStep: SubStep = { ...newSubStep, id: subStepId };
    
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id === phaseId) {
          const updatedPhase = { 
            ...phase, 
            subSteps: [...phase.subSteps, subStep] 
          };
          return {
            ...updatedPhase,
            progress: recalculatePhaseProgress(updatedPhase),
            status: calculatePhaseStatus(updatedPhase),
          };
        }
        return phase;
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const removeSubStep = useCallback((phaseId: string, subStepId: string) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id === phaseId) {
          const updatedPhase = { 
            ...phase, 
            subSteps: phase.subSteps.filter(s => s.id !== subStepId) 
          };
          return {
            ...updatedPhase,
            progress: recalculatePhaseProgress(updatedPhase),
            status: calculatePhaseStatus(updatedPhase),
          };
        }
        return phase;
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const reorderSubSteps = useCallback((phaseId: string, fromIndex: number, toIndex: number) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id === phaseId) {
          const newSubSteps = [...phase.subSteps];
          const [removed] = newSubSteps.splice(fromIndex, 1);
          newSubSteps.splice(toIndex, 0, removed);
          const updatedPhase = { ...phase, subSteps: newSubSteps };
          return {
            ...updatedPhase,
            progress: recalculatePhaseProgress(updatedPhase),
            status: calculatePhaseStatus(updatedPhase),
          };
        }
        return phase;
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const calculateOverallProgress = useCallback((): number => {
    if (phases.length === 0) return 0;
    
    const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = phases.reduce((sum, phase) => {
      return sum + (phase.progress * phase.weight) / 100;
    }, 0);
    
    return Math.round((weightedSum / totalWeight) * 100);
  }, [phases]);

  const resetToDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPhases(INITIAL_PHASES);
  }, []);

  const addPhase = useCallback((newPhase: Omit<ConstructionPhase, 'id'>) => {
    const phaseId = `p_${Date.now()}`;
    const phase: ConstructionPhase = { ...newPhase, id: phaseId };
    setPhases(prev => [...prev, phase]);
  }, []);

  const removePhase = useCallback((phaseId: string) => {
    setPhases(prev => prev.filter(p => p.id !== phaseId));
  }, []);

  return (
    <ConstructionContext.Provider 
      value={{
        phases,
        setPhases,
        updatePhase,
        updateSubStep,
        addSubStep,
        removeSubStep,
        reorderSubSteps,
        addPhase,
        removePhase,
        calculateOverallProgress,
        resetToDefault,
        editingPhaseId,
        setEditingPhaseId,
      }}
    >
      {children}
    </ConstructionContext.Provider>
  );
}

export function useConstruction() {
  const context = useContext(ConstructionContext);
  if (!context) {
    throw new Error('useConstruction must be used within ConstructionProvider');
  }
  return context;
}

function calculatePhaseStatus(phase: ConstructionPhase): Status {
  const progress = calculatePhaseProgress(phase);
  if (progress === 0) return 'NOT_STARTED';
  if (progress === 100) return 'COMPLETED';
  
  if (phase.status === 'BLOCKED') return 'BLOCKED';
  
  const today = new Date();
  const deadline = new Date(phase.endDate);
  if (phase.status !== 'COMPLETED' && today > deadline) {
    return 'DELAYED';
  }
  
  if (progress < 100 && progress > 0) return 'IN_PROGRESS';
  
  return 'IN_PROGRESS';
}