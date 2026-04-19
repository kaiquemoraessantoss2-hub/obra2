'use client';

import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { SubStep, Status } from '../types';
import { useConstruction } from '../context/ConstructionContext';
import { cn } from '../lib/utils';

interface AddSubStepFormProps {
  phaseId: string;
  onCancel?: () => void;
}

const DEFAULT_STATUS: Status = 'NOT_STARTED';

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'NOT_STARTED', label: 'Não Iniciado', color: 'text-slate-500' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: 'text-blue-500' },
  { value: 'COMPLETED', label: 'Concluído', color: 'text-emerald-500' },
  { value: 'DELAYED', label: 'Atrasado', color: 'text-amber-500' },
  { value: 'BLOCKED', label: 'Bloqueado', color: 'text-rose-500' },
];

export default function AddSubStepForm({ phaseId, onCancel }: AddSubStepFormProps) {
  const { addSubStep } = useConstruction();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<Partial<SubStep>>({
    name: '',
    progress: 0,
    status: DEFAULT_STATUS,
    responsible: '',
    observations: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof SubStep, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    if (formData.progress !== undefined && (formData.progress < 0 || formData.progress > 100)) {
      newErrors.progress = 'Progresso deve estar entre 0 e 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    if (!formData.name) {
      setErrors({ name: 'Nome é obrigatório' });
      return;
    }

    const newSubStep = {
      name: formData.name!,
      progress: formData.progress || 0,
      status: formData.status || DEFAULT_STATUS,
      responsible: formData.responsible || '',
      observations: formData.observations || '',
      hasFloorBreakdown: false,
    };
    
    addSubStep(phaseId, newSubStep);
    
    setFormData({
      name: '',
      progress: 0,
      status: DEFAULT_STATUS,
      responsible: '',
      observations: '',
    });
    setIsExpanded(false);
    
    if (onCancel) onCancel();
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      progress: 0,
      status: DEFAULT_STATUS,
      responsible: '',
      observations: '',
    });
    setErrors({});
    setIsExpanded(false);
    if (onCancel) onCancel();
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-4 border border-dashed border-white/10 rounded-3xl text-slate-500 hover:text-white hover:border-white/30 hover:bg-white/[0.02] transition-all flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        <span className="text-sm font-bold">Adicionar sub-etapa</span>
      </button>
    );
  }

  return (
    <div className="p-4 bg-white/[0.04] border border-blue-600/30 rounded-3xl animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-blue-500">Nova Sub-etapa</h4>
          <button
            onClick={handleCancel}
            className="p-1 text-slate-500 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nome *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              autoFocus
              className={cn(
                "w-full px-3 py-2 bg-white/5 border rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50",
                errors.name ? "border-rose-500" : "border-white/10"
              )}
              placeholder="Nome da sub-etapa"
            />
            {errors.name && (
              <p className="text-[10px] text-rose-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
            <select
              value={formData.status || DEFAULT_STATUS}
              onChange={(e) => handleChange('status', e.target.value as Status)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Responsável</label>
            <input
              type="text"
              value={formData.responsible || ''}
              onChange={(e) => handleChange('responsible', e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
              placeholder="Nome do responsável"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Progresso: {formData.progress || 0}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={formData.progress || 0}
              onChange={(e) => handleChange('progress', parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        </div>

        {errors.progress && (
          <p className="text-[10px] text-rose-500">{errors.progress}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-slate-500 text-sm font-bold hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 rounded-xl text-white text-sm font-bold hover:bg-blue-500 transition-all flex items-center gap-2"
          >
            <Check size={14} />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}