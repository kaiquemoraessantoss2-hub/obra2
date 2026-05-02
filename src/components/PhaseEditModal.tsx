'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, BarChart3, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ConstructionPhase, Status } from '../types';
import { useConstruction } from '../context/ConstructionContext';
import { cn } from '../lib/utils';

interface PhaseEditModalProps {
  phase: ConstructionPhase;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'NOT_STARTED', label: 'Não Iniciado', color: 'text-slate-500' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: 'text-blue-500' },
  { value: 'COMPLETED', label: 'Concluído', color: 'text-emerald-500' },
  { value: 'DELAYED', label: 'Atrasado', color: 'text-amber-500' },
  { value: 'BLOCKED', label: 'Bloqueado', color: 'text-rose-500' },
];

export default function PhaseEditModal({ phase, isOpen, onClose }: PhaseEditModalProps) {
  const { updatePhase, calculateOverallProgress } = useConstruction();
  
  const [formData, setFormData] = useState<Partial<ConstructionPhase>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: phase.name,
        weight: phase.weight,
        progress: phase.progress,
        status: phase.status,
        startDate: phase.startDate,
        endDate: phase.endDate,
        actualEndDate: phase.actualEndDate,
        responsible: phase.responsible,
        observations: phase.observations || '',
      });
      setHasChanges(false);
      setErrors({});
      setShowCompletionPrompt(false);
    }
  }, [isOpen, phase]);

  const handleChange = (field: keyof ConstructionPhase, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    if (field === 'status' && value === 'COMPLETED' && formData.progress && formData.progress < 100) {
      setShowCompletionPrompt(true);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    if (formData.progress !== undefined && (formData.progress < 0 || formData.progress > 100)) {
      newErrors.progress = 'Progresso deve estar entre 0 e 100';
    }
    
    if (formData.weight !== undefined && (formData.weight < 0 || formData.weight > 100)) {
      newErrors.weight = 'Peso deve estar entre 0 e 100';
    }
    
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'Data fim não pode ser anterior à data início';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    await updatePhase(phase.id, formData);
    
    setHasChanges(false);
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      name: phase.name,
      weight: phase.weight,
      progress: phase.progress,
      status: phase.status,
      startDate: phase.startDate,
      endDate: phase.endDate,
      actualEndDate: phase.actualEndDate,
      responsible: phase.responsible,
      observations: phase.observations || '',
    });
    setHasChanges(false);
    onClose();
  };

  const handleProgressChange = (value: number) => {
    setFormData(prev => ({ ...prev, progress: value }));
    setHasChanges(true);
    
    if (value === 100 && formData.status !== 'COMPLETED') {
      setShowCompletionPrompt(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleCancel}
      />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card border border-white/10 rounded-[32px] bg-[#0a0a0a]/95">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/5 bg-[#0a0a0a]/95">
          <div className="flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", phase.color)}>
              <span className="text-white font-bold text-sm">{phase.progress}%</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Editar Fase</h2>
              <p className="text-xs text-slate-500">{phase.name}</p>
            </div>
          </div>
          
          {hasChanges && (
            <div className="flex items-center gap-2 text-orange-500">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold">Alterações não salvas</span>
            </div>
          )}
          
          <button 
            onClick={handleCancel}
            className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} /> Informações Gerais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Nome da Fase</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all",
                    errors.name ? "border-rose-500" : "border-white/10"
                  )}
                  placeholder="Nome da fase"
                />
                {errors.name && (
                  <p className="text-xs text-rose-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Responsável Técnico</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formData.responsible || ''}
                    onChange={(e) => handleChange('responsible', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Peso no Projeto (%)</label>
                <div className="relative">
                  <BarChart3 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.weight || 0}
                    onChange={(e) => handleChange('weight', parseInt(e.target.value) || 0)}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50",
                      errors.weight ? "border-rose-500" : "border-white/10"
                    )}
                    placeholder="Peso (%)"
                  />
                </div>
                {errors.weight && (
                  <p className="text-xs text-rose-500">{errors.weight}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Status</label>
                <select
                  value={formData.status || 'NOT_STARTED'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Cronograma
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Data de Início</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Previsão de Término</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50",
                    errors.endDate ? "border-rose-500" : "border-white/10"
                  )}
                />
                {errors.endDate && (
                  <p className="text-xs text-rose-500">{errors.endDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">Data de Conclusão Real</label>
                <input
                  type="date"
                  value={formData.actualEndDate || ''}
                  onChange={(e) => handleChange('actualEndDate', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} /> Progresso
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.progress || 0}
                  onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="w-20">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.progress || 0}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value) || 0)}
                    className={cn(
                      "w-full px-3 py-2 bg-white/5 border rounded-xl text-white font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-600/50",
                      errors.progress ? "border-rose-500" : "border-white/10"
                    )}
                  />
                </div>
                <span className="text-white font-bold">%</span>
              </div>
              {errors.progress && (
                <p className="text-xs text-rose-500">{errors.progress}</p>
              )}
              
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", phase.color.replace('bg-', 'bg-opacity-100 bg-'))}
                  style={{ width: `${formData.progress || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} /> Observações
            </h3>
            
            <textarea
              value={formData.observations || ''}
              onChange={(e) => handleChange('observations', e.target.value)}
              className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 resize-none"
              placeholder="Observações gerais da fase..."
            />
          </div>

          {showCompletionPrompt && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-amber-200 font-medium">
                  O progresso está em 100%. Deseja marka o status como &quot;Concluído&quot; automaticamente?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleChange('status', 'COMPLETED');
                      setShowCompletionPrompt(false);
                    }}
                    className="px-3 py-1.5 bg-amber-500/20 text-amber-500 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition-all"
                  >
                    <CheckCircle size={14} className="inline mr-1" />
                    Sim, marcar como Concluído
                  </button>
                  <button
                    onClick={() => setShowCompletionPrompt(false)}
                    className="px-3 py-1.5 text-slate-400 rounded-lg text-xs font-bold hover:text-white transition-all"
                  >
                    Manter atual
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-white/5 bg-[#0a0a0a]/95">
          <button
            onClick={handleCancel}
            className="px-6 py-3 text-slate-400 font-bold text-sm hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={cn(
              "px-6 py-3 bg-blue-600 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all",
              hasChanges ? "hover:bg-blue-500" : "opacity-50 cursor-not-allowed"
            )}
          >
            <Save size={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}