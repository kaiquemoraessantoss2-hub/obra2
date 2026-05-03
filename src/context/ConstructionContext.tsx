'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ConstructionPhase, SubStep, Status } from '../types';
import { calculatePhaseProgress } from '../lib/constructionPhasesMock';
import { saveProjectPhases, loadProjectPhases } from '../lib/projectStorage';
import { supabase } from '../lib/supabase';

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
  projectId: string | null;
  setProjectId: (id: string) => void;
}

const ConstructionContext = createContext<ConstructionContextType | undefined>(undefined);

export function ConstructionProvider({ children }: { children: ReactNode }) {
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [projectId, setProjectIdState] = useState<string | null>(null);

  const setProjectId = useCallback((id: string) => {
    setProjectIdState(id);
    setIsInitialized(false);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    loadProjectPhases(projectId).then(loaded => {
      setPhases(loaded && loaded.length > 0 ? loaded : []);
      setIsInitialized(true);
    });
  }, [projectId]);

  useEffect(() => {
    if (!isInitialized || !projectId) return;
    saveProjectPhases(projectId, phases);
  }, [phases, isInitialized, projectId]);

  // Realtime subscription for synchronization
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`context-sync-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_phases',
        filter: `project_id=eq.${projectId}`
      }, async () => {
        const loaded = await loadProjectPhases(projectId);
        if (loaded) {
          // Compare with current state to avoid loops if needed, 
          // but setPhases is usually safe if data is truly different
          setPhases(loaded);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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
        if (phase.id !== phaseId) return phase;
        const updatedPhase = { ...phase, ...data };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const updateSubStep = useCallback((phaseId: string, subStepId: string, data: Partial<SubStep>) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedSubSteps = phase.subSteps.map(s => s.id === subStepId ? { ...s, ...data } : s);
        const updatedPhase = { ...phase, subSteps: updatedSubSteps };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const addSubStep = useCallback((phaseId: string, newSubStep: Omit<SubStep, 'id'>) => {
    const subStep: SubStep = { ...newSubStep, id: `s${phaseId.replace('p', '')}_${Date.now()}` };
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedPhase = { ...phase, subSteps: [...phase.subSteps, subStep] };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const removeSubStep = useCallback((phaseId: string, subStepId: string) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const updatedPhase = { ...phase, subSteps: phase.subSteps.filter(s => s.id !== subStepId) };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const reorderSubSteps = useCallback((phaseId: string, fromIndex: number, toIndex: number) => {
    setPhases(prev => {
      const updated = prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const newSubSteps = [...phase.subSteps];
        const [removed] = newSubSteps.splice(fromIndex, 1);
        newSubSteps.splice(toIndex, 0, removed);
        const updatedPhase = { ...phase, subSteps: newSubSteps };
        return { ...updatedPhase, progress: recalculatePhaseProgress(updatedPhase), status: calculatePhaseStatus(updatedPhase) };
      });
      return recalculateAllPhases(updated);
    });
  }, [recalculatePhaseProgress, recalculateAllPhases]);

  const calculateOverallProgress = useCallback((): number => {
    if (phases.length === 0) return 0;
    const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = phases.reduce((sum, p) => sum + (p.progress * p.weight) / 100, 0);
    return Math.round((weightedSum / totalWeight) * 100);
  }, [phases]);

  const resetToDefault = useCallback(() => {
    if (projectId) saveProjectPhases(projectId, []);
    setPhases([]);
  }, [projectId]);

  const addPhase = useCallback((newPhase: Omit<ConstructionPhase, 'id'>) => {
    setPhases(prev => [...prev, { ...newPhase, id: `p_${Date.now()}` }]);
  }, []);

  const removePhase = useCallback((phaseId: string) => {
    setPhases(prev => prev.filter(p => p.id !== phaseId));
  }, []);

  return (
    <ConstructionContext.Provider value={{
      phases, setPhases,
      updatePhase, updateSubStep, addSubStep, removeSubStep,
      reorderSubSteps, addPhase, removePhase,
      calculateOverallProgress, resetToDefault,
      editingPhaseId, setEditingPhaseId,
      projectId, setProjectId,
    }}>
      {children}
    </ConstructionContext.Provider>
  );
}

export function useConstruction() {
  const context = useContext(ConstructionContext);
  if (!context) throw new Error('useConstruction must be used within ConstructionProvider');
  return context;
}

function calculatePhaseStatus(phase: ConstructionPhase): Status {
  const progress = calculatePhaseProgress(phase);
  if (progress === 0) return 'NOT_STARTED';
  if (progress === 100) return 'COMPLETED';
  if (phase.status === 'BLOCKED') return 'BLOCKED';
  if (phase.status !== 'COMPLETED' && new Date() > new Date(phase.endDate)) return 'DELAYED';
  return 'IN_PROGRESS';
}
