'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Box, Layers, Building, Zap, Droplets, CheckCircle, Users, Shield, 
  Calendar, User as UserIcon, AlertCircle, BarChart3, Plus, Pencil, RotateCcw, X, Check, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { ConstructionPhase, SubStep, Status } from '../types';
import { cn } from '../lib/utils';
import { useConstruction } from '../context/ConstructionContext';

const ICON_MAP: Record<string, any> = {
  FileText, Box, Layers, Building, Zap, Droplets, CheckCircle, Users, Shield
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Não Iniciado' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'DELAYED', label: 'Atrasado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
];

const getTemplatePhases = (): ConstructionPhase[] => {
  const timestamp = Date.now();
  return [
    { id: `p_${timestamp}_1`, name: 'PRÉ-OBRA', icon: 'FileText', color: 'bg-blue-500', progress: 0, status: 'NOT_STARTED', weight: 5, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${timestamp}_1`, name: 'Projeto Executivo', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${timestamp}_2`, name: 'Aprovação', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${timestamp}_3`, name: 'Licenciamento', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${timestamp}_2`, name: 'FUNDAÇÃO', icon: 'Building', color: 'bg-amber-500', progress: 0, status: 'NOT_STARTED', weight: 10, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${timestamp}_4`, name: 'Escavação', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${timestamp}_5`, name: 'Fundação', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${timestamp}_6`, name: 'Impermeabilização', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${timestamp}_3`, name: 'ESTRUTURA', icon: 'Building', color: 'bg-emerald-500', progress: 0, status: 'NOT_STARTED', weight: 20, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${timestamp}_7`, name: 'Pilares', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${timestamp}_8`, name: 'Lajes', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${timestamp}_9`, name: 'Escada/Rampa', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
  ];
};

interface ConstructionTimelineProps {
  phases: ConstructionPhase[];
  onUpdatePhase?: (phaseId: string, data: Partial<ConstructionPhase>) => void;
  onAddPhase?: (phase: ConstructionPhase) => void;
  onRemovePhase?: (phaseId: string) => void;
}

export default function ConstructionTimeline({ phases: initialPhases, onUpdatePhase, onAddPhase, onRemovePhase }: ConstructionTimelineProps) {
  const [phases, setPhases] = useState<ConstructionPhase[]>(initialPhases || []);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [showAddPhase, setShowAddPhase] = useState(false);

  useEffect(() => {
    if (initialPhases && initialPhases.length > 0) {
      setPhases(initialPhases);
      if (!selectedPhaseId) {
        setSelectedPhaseId(initialPhases[0].id);
      }
    }
  }, [initialPhases]);

  const updatePhase = (phaseId: string, data: Partial<ConstructionPhase>) => {
    const updated = phases.map(p => p.id === phaseId ? { ...p, ...data } : p);
    setPhases(updated);
    if (onUpdatePhase) {
      onUpdatePhase(phaseId, data);
    }
  };

  const addPhase = (phase: ConstructionPhase) => {
    const updated = [...phases, phase];
    setPhases(updated);
    if (onAddPhase) {
      onAddPhase(phase);
    }
    setSelectedPhaseId(phase.id);
  };

  const removePhase = (phaseId: string) => {
    const updated = phases.filter(p => p.id !== phaseId);
    setPhases(updated);
    if (onRemovePhase) {
      onRemovePhase(phaseId);
    }
    if (selectedPhaseId === phaseId && updated.length > 0) {
      setSelectedPhaseId(updated[0].id);
    }
  };

  const addSubStep = (phaseId: string, subStep: SubStep) => {
    const calculatePhaseProgress = (subSteps: SubStep[]) => {
      if (subSteps.length === 0) return 0;
      const total = subSteps.reduce((acc, s) => acc + s.progress, 0);
      return Math.round(total / subSteps.length);
    };

    const updated = phases.map(p => {
      if (p.id !== phaseId) return p;
      const newSubSteps = [...p.subSteps, subStep];
      const newProgress = calculatePhaseProgress(newSubSteps);
      return { ...p, subSteps: newSubSteps, progress: newProgress };
    });
    setPhases(updated);
    if (onUpdatePhase) {
      const phase = updated.find(p => p.id === phaseId);
      if (phase) {
        onUpdatePhase(phaseId, { subSteps: phase.subSteps, progress: phase.progress });
      }
    }
  };

  const updateSubStep = (phaseId: string, subStepId: string, data: Partial<SubStep>) => {
    const calculatePhaseProgress = (subSteps: SubStep[]) => {
      if (subSteps.length === 0) return 0;
      const total = subSteps.reduce((acc, s) => acc + s.progress, 0);
      return Math.round(total / subSteps.length);
    };

    const updated = phases.map(p => {
      if (p.id !== phaseId) return p;
      const newSubSteps = p.subSteps.map(s => s.id === subStepId ? { ...s, ...data } : s);
      const newProgress = calculatePhaseProgress(newSubSteps);
      const newStatus = newProgress === 100 ? 'COMPLETED' : newProgress > 0 ? 'IN_PROGRESS' : p.status;
      return {
        ...p,
        subSteps: newSubSteps,
        progress: newProgress,
        status: newStatus
      };
    });
    setPhases(updated);
    if (onUpdatePhase) {
      const phase = updated.find(p => p.id === phaseId);
      if (phase) {
        onUpdatePhase(phaseId, { 
          subSteps: phase.subSteps,
          progress: phase.progress,
          status: phase.status
        });
      }
    }
  };

  const selectedPhase = useMemo(() => 
    phases.find(p => p.id === selectedPhaseId) || phases[0], 
  [phases, selectedPhaseId]);

  const selectedPhaseIndex = useMemo(() => 
    phases.findIndex(p => p.id === selectedPhaseId), 
  [phases, selectedPhaseId]);

  const overallProgress = useMemo(() => {
    if (phases.length === 0) return 0;
    const totalWeight = phases.reduce((acc, p) => acc + p.weight, 0);
    const weightedSum = phases.reduce((acc, p) => acc + (p.progress * p.weight), 0);
    return Math.round(weightedSum / (totalWeight || 1));
  }, [phases]);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/40';
      case 'IN_PROGRESS': return 'text-blue-500 bg-blue-500/20 border-blue-500/40';
      case 'DELAYED': return 'text-amber-500 bg-amber-500/20 border-amber-500/40';
      case 'BLOCKED': return 'text-rose-500 bg-rose-500/20 border-rose-500/40';
      default: return 'text-slate-400 bg-white/10 border-white/20';
    }
  };

  const isDelayed = (phase: ConstructionPhase) => {
    if (phase.status === 'COMPLETED') return false;
    const today = new Date();
    const deadline = new Date(phase.endDate);
    return today > deadline;
  };

  const handlePrevPhase = () => {
    if (selectedPhaseIndex > 0) setSelectedPhaseId(phases[selectedPhaseIndex - 1].id);
  };

  const handleNextPhase = () => {
    if (selectedPhaseIndex < phases.length - 1) setSelectedPhaseId(phases[selectedPhaseIndex + 1].id);
  };

  const handleDeletePhase = () => {
    if (confirm(`Tem certeza que deseja excluir a fase "${selectedPhase?.name}"?`)) {
      if (selectedPhase) {
        removePhase(selectedPhase.id);
        if (phases.length > 1) {
          const newIndex = Math.max(0, selectedPhaseIndex - 1);
          setSelectedPhaseId(phases[newIndex >= phases.length ? phases.length - 1 : newIndex]?.id || null);
        }
      }
    }
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja usar o template padrão? Isso substituirá as fases atuais.')) {
      const template = getTemplatePhases();
      setPhases(template);
      if (onAddPhase) {
        template.forEach(phase => onAddPhase(phase));
      }
    }
  };

  if (phases.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white">Cronograma de Obra</h3>
            <p className="text-xs text-slate-500">Nenhuma fase cadastrada.</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="btn-primary"
        >
          <RotateCcw size={16} className="mr-2" />
          Usar Template de Fases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">Cronograma de Obra</h3>
          <p className="text-xs text-slate-500">Edite diretamente nos campos abaixo.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-600 uppercase">Progresso Geral</p>
            <p className="text-lg font-black text-white">{overallProgress}%</p>
          </div>
          
          <button
            onClick={() => setShowAddPhase(true)}
            className="p-2 bg-emerald-600/20 text-emerald-500 rounded-xl hover:bg-emerald-600/30 transition-all"
            title="Adicionar nova fase"
          >
            <Plus size={18} />
          </button>
          
          <button
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-orange-500 transition-all"
            title="Restaurar dados padrão"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {showAddPhase && (
        <AddPhaseForm onClose={() => setShowAddPhase(false)} onAdd={(phase) => addPhase(phase)} />
      )}

      {selectedPhase && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
<PhaseCardEdit
              phase={selectedPhase}
              onDelete={handleDeletePhase}
              onUpdate={(phaseId, data) => {
                if (onUpdatePhase) {
                  onUpdatePhase(phaseId, data);
                }
              }}
            />

          <div className="xl:col-span-2 space-y-6">
            <SubStepsList 
              phaseId={selectedPhase.id} 
              subSteps={selectedPhase.subSteps}
              onUpdateSubStep={updateSubStep}
              onAddSubStep={(subStep) => addSubStep(selectedPhase.id, subStep)}
              onRemoveSubStep={(phaseId, subStepId) => {
                const updated = phases.map(p => {
                  if (p.id !== phaseId) return p;
                  return { ...p, subSteps: p.subSteps.filter(s => s.id !== subStepId) };
                });
                setPhases(updated);
                if (onUpdatePhase) {
                  const phase = phases.find(p => p.id === phaseId);
                  if (phase) {
                    onUpdatePhase(phaseId, { subSteps: phase.subSteps.filter(s => s.id !== subStepId) });
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevPhase}
          disabled={selectedPhaseIndex === 0}
          className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        
        <span className="text-sm font-bold text-slate-500">
          {selectedPhaseIndex + 1} / {phases.length}
        </span>
        
        <button
          onClick={handleNextPhase}
          disabled={selectedPhaseIndex === phases.length - 1}
          className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

interface PhaseCardEditProps {
  phase: ConstructionPhase;
  onDelete: () => void;
  onUpdate: (phaseId: string, data: Partial<ConstructionPhase>) => void;
}

function PhaseCardEdit({ phase, onDelete, onUpdate }: PhaseCardEditProps) {
  const [editData, setEditData] = useState({
    name: phase.name,
    weight: phase.weight,
    progress: phase.progress,
    status: phase.status,
    startDate: phase.startDate,
    endDate: phase.endDate,
    actualEndDate: phase.actualEndDate || '',
    responsible: phase.responsible,
    observations: phase.observations || '',
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(phase.id, {
      name: editData.name,
      weight: editData.weight,
      progress: editData.progress,
      status: editData.status as Status,
      startDate: editData.startDate,
      endDate: editData.endDate,
      actualEndDate: editData.actualEndDate || undefined,
      responsible: editData.responsible,
      observations: editData.observations || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: phase.name,
      weight: phase.weight,
      progress: phase.progress,
      status: phase.status,
      startDate: phase.startDate,
      endDate: phase.endDate,
      actualEndDate: phase.actualEndDate || '',
      responsible: phase.responsible,
      observations: phase.observations || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="glass-card p-8 rounded-[40px] border-white/5 space-y-6">
      <div className="flex items-center justify-between relative z-10">
        {isEditing ? (
          <input
            type="text"
            value={editData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="text-2xl font-black text-white bg-transparent border-b border-blue-500 focus:outline-none flex-1 mr-2"
          />
        ) : (
          <h2 className="text-2xl font-black text-white">{phase.name}</h2>
        )}
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="p-2 text-slate-500 hover:text-white bg-black/50 rounded-xl">
                <X size={18} />
              </button>
              <button onClick={handleSave} className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-500">
                <Check size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-blue-600/20 text-blue-500 rounded-xl hover:bg-blue-600/30"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-slate-500 hover:text-rose-500"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Responsável Técnico</label>
          {isEditing ? (
            <input
              type="text"
              value={editData.responsible}
              onChange={(e) => handleChange('responsible', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
            />
          ) : (
            <p className="text-sm font-bold text-slate-300">{phase.responsible}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Peso (%)</label>
            {isEditing ? (
              <input
                type="number"
                min={0}
                max={100}
                value={editData.weight}
                onChange={(e) => handleChange('weight', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              />
            ) : (
              <p className="text-sm font-bold text-white">{phase.weight}%</p>
            )}
          </div>
          <div>
<label className="text-[10px] font-black text-slate-600 uppercase">Status</label>
            {isEditing ? (
              <select
                value={editData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-white text-sm"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">{opt.label}</option>
                ))}
              </select>
            ) : (
<span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border", getStatusColor(phase.status))}>
              {phase.status === 'COMPLETED' ? 'Concluído' : phase.status === 'IN_PROGRESS' ? 'Em Andamento' : phase.status === 'NOT_STARTED' ? 'Não Iniciado' : phase.status.replace('_', ' ')}
            </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Data Início</label>
            {isEditing ? (
              <input
                type="date"
                value={editData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              />
            ) : (
              <p className="text-xs font-bold text-slate-400">{new Date(phase.startDate).toLocaleDateString()}</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Previsão Fim</label>
            {isEditing ? (
              <input
                type="date"
                value={editData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
              />
            ) : (
              <p className="text-xs font-bold text-slate-400">{new Date(phase.endDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Progresso: {editData.progress}%</label>
          {isEditing ? (
            <input
              type="range"
              min={0}
              max={100}
              value={editData.progress}
              onChange={(e) => handleChange('progress', parseInt(e.target.value))}
              className="w-full mt-2 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
            />
          ) : (
            <div className="mt-2">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all", phase.color.replace('bg-', 'bg-opacity-100 bg-'))}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Observações</label>
            <textarea
              value={editData.observations}
              onChange={(e) => handleChange('observations', e.target.value)}
              className="w-full mt-1 h-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SubStepsList({ 
  phaseId, 
  subSteps,
  onUpdateSubStep,
  onAddSubStep,
  onRemoveSubStep
}: { 
  phaseId: string; 
  subSteps: SubStep[];
  onUpdateSubStep: (phaseId: string, subStepId: string, data: Partial<SubStep>) => void;
  onAddSubStep: (subStep: SubStep) => void;
  onRemoveSubStep: (phaseId: string, subStepId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/40';
      case 'IN_PROGRESS': return 'text-blue-500 bg-blue-500/20 border-blue-500/40';
      case 'DELAYED': return 'text-amber-500 bg-amber-500/20 border-amber-500/40';
      case 'BLOCKED': return 'text-rose-500 bg-rose-500/20 border-rose-500/40';
      default: return 'text-slate-400 bg-white/10 border-white/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-white">Sub-etapas</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-blue-600/20 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-600/30 flex items-center gap-1"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {showAdd && (
        <AddSubStepInlineForm
          phaseId={phaseId}
          onClose={() => setShowAdd(false)}
          onAdd={onAddSubStep}
        />
      )}

      <div className="space-y-3">
        {subSteps.map((step, index) => (
          <div key={step.id}>
            {editingId === step.id ? (
              <SubStepInlineEdit
                phaseId={phaseId}
                subStep={step}
                onClose={() => setEditingId(null)}
                onUpdate={onUpdateSubStep}
              />
            ) : (
              <div 
                className="group p-4 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all cursor-pointer"
                onClick={() => setEditingId(step.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                      step.progress === 100 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : "border-white/10"
                    )}>
                      {step.progress === 100 && <CheckCircle size={12} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white text-sm font-medium truncate">{step.name}</h4>
                      {step.responsible && (
                        <p className="text-[10px] text-slate-500 truncate">{step.responsible}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={step.progress}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateSubStep(phaseId, step.id, { progress: parseInt(e.target.value) });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-400 w-8">{step.progress}%</span>
                    <select
                      value={step.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateSubStep(phaseId, step.id, { status: e.target.value as Status });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={cn("px-2 py-1 rounded text-[8px] font-bold border cursor-pointer", getStatusColor(step.status))}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir "${step.name}"?`)) {
                          onRemoveSubStep(phaseId, step.id);
                        }
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="p-2 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {subSteps.length === 0 && !showAdd && (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-3xl">
          <p className="text-slate-500 text-sm">Nenhuma sub-etapa nesta fase.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 text-blue-500 text-sm hover:underline"
          >
            Adicionar primeira sub-etapa
          </button>
        </div>
      )}
    </div>
  );
}

function SubStepInlineEdit({ phaseId, subStep, onClose, onUpdate }: { phaseId: string; subStep: SubStep; onClose: () => void; onUpdate: (phaseId: string, subStepId: string, data: Partial<SubStep>) => void }) {
  const [formData, setFormData] = useState({
    name: subStep.name,
    progress: subStep.progress,
    status: subStep.status,
    responsible: subStep.responsible || '',
    observations: subStep.observations || '',
  });

  return (
    <div className="p-4 bg-white/[0.04] border border-blue-600/30 rounded-3xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
          placeholder="Nome da sub-etapa"
        />
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Status }))}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={formData.responsible}
          onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
          placeholder="Responsável"
        />
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={formData.progress}
            onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
            className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
          />
          <span className="text-xs font-bold text-white w-10">{formData.progress}%</span>
        </div>
      </div>
      <textarea
        value={formData.observations}
        onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
        className="w-full h-16 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none"
        placeholder="Observações..."
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-slate-500 text-sm">Cancelar</button>
        <button
          onClick={() => {
            onUpdate(phaseId, subStep.id, formData);
            onClose();
          }}
          className="px-3 py-1.5 bg-blue-600 rounded-lg text-white text-sm"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function AddSubStepInlineForm({ phaseId, onClose, onAdd }: { phaseId: string; onClose: () => void; onAdd: (subStep: SubStep) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    progress: 0,
    status: 'NOT_STARTED' as Status,
    responsible: '',
    observations: '',
  });

  return (
    <div className="p-4 bg-slate-900/80 border border-emerald-600/30 rounded-3xl space-y-4">
      <h4 className="text-sm font-bold text-emerald-500">Nova Sub-etapa</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-white text-sm"
          placeholder="Nome da sub-etapa *"
          autoFocus
        />
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Status }))}
          className="px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-white text-sm"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={formData.responsible}
          onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-white text-sm"
          placeholder="Responsável"
        />
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={formData.progress}
            onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
            className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
          />
          <span className="text-xs font-bold text-white w-10">{formData.progress}%</span>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-slate-500 text-sm">Cancelar</button>
        <button
          onClick={() => {
            if (!formData.name.trim()) return;
            const newSubStep: SubStep = {
              id: `s_${Date.now()}`,
              ...formData,
              hasFloorBreakdown: false,
            };
            onAdd(newSubStep);
            onClose();
          }}
          className="px-3 py-1.5 bg-emerald-600 rounded-lg text-white text-sm"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

function AddPhaseForm({ onClose, onAdd }: { onClose: () => void; onAdd?: (phase: ConstructionPhase) => void }) {
  const icons = ['FileText', 'Box', 'Layers', 'Building', 'Zap', 'Droplets', 'CheckCircle', 'Users', 'Shield'];
  const colors = ['bg-blue-500', 'bg-amber-600', 'bg-indigo-500', 'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-teal-500', 'bg-emerald-500', 'bg-violet-500', 'bg-slate-700'];
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [FormData, setFormData] = useState({
    name: '',
    icon: 'Box',
    color: 'bg-blue-500',
    weight: 10,
    responsible: '',
    startDate: today,
    endDate: thirtyDaysLater,
  });

  return (
    <div className="p-6 bg-white/[0.04] border border-emerald-600/30 rounded-3xl space-y-4">
      <h4 className="text-lg font-bold text-emerald-500">Nova Fase</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Nome da Fase *</label>
          <input
            type="text"
            value={FormData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
            placeholder="Ex: Estrutura, Alvenaria..."
            autoFocus
          />
        </div>
        
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Ícone</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {icons.map(icon => {
              const IconComp = ICON_MAP[icon];
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    FormData.icon === icon ? "bg-blue-600" : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <IconComp size={18} className="text-white" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Cor</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={cn(
                  "w-10 h-10 rounded-xl transition-all",
                  color,
                  FormData.color === color && "ring-2 ring-white ring-offset-2 ring-offset-black"
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Peso (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={FormData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Responsável</label>
          <input
            type="text"
            value={FormData.responsible}
            onChange={(e) => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
            placeholder="Nome do responsável"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Início</label>
            <input
              type="date"
              value={FormData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Fim</label>
            <input
              type="date"
              value={FormData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-slate-500 text-sm">Cancelar</button>
        <button
          onClick={() => {
            if (!FormData.name.trim()) return;
            const newPhase: ConstructionPhase = {
              id: `p_${Date.now()}`,
              name: FormData.name,
              icon: FormData.icon,
              color: FormData.color,
              weight: FormData.weight,
              progress: 0,
              status: 'NOT_STARTED',
              startDate: FormData.startDate,
              endDate: FormData.endDate,
              responsible: FormData.responsible,
              observations: '',
              subSteps: [],
            };
            onAdd?.(newPhase);
            onClose();
          }}
          className="px-4 py-2 bg-emerald-600 rounded-xl text-white text-sm font-bold"
        >
          Criar Fase
        </button>
      </div>
    </div>
  );
}

function getStatusColor(status: Status) {
  switch (status) {
    case 'COMPLETED': return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/40';
    case 'IN_PROGRESS': return 'text-blue-500 bg-blue-500/20 border-blue-500/40';
    case 'DELAYED': return 'text-amber-500 bg-amber-500/20 border-amber-500/40';
    case 'BLOCKED': return 'text-rose-500 bg-rose-500/20 border-rose-500/40';
    default: return 'text-slate-400 bg-white/10 border-white/20';
  }
}