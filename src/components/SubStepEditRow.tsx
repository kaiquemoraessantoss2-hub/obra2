'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { SubStep, Status } from '../types';
import { useConstruction } from '../context/ConstructionContext';
import { cn } from '../lib/utils';

interface SubStepEditRowProps {
  phaseId: string;
  subStep: SubStep;
  canEdit?: boolean;
  canDelete?: boolean;
  canReorder?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'NOT_STARTED', label: 'Não Iniciado', color: 'text-slate-500' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: 'text-blue-500' },
  { value: 'COMPLETED', label: 'Concluído', color: 'text-emerald-500' },
  { value: 'DELAYED', label: 'Atrasado', color: 'text-amber-500' },
  { value: 'BLOCKED', label: 'Bloqueado', color: 'text-rose-500' },
];

export default function SubStepEditRow({
  phaseId,
  subStep,
  canEdit = true,
  canDelete = true,
  canReorder = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: SubStepEditRowProps) {
  const { updateSubStep, removeSubStep, reorderSubSteps } = useConstruction();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<Partial<SubStep>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localIndex, setLocalIndex] = useState(0);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: subStep.name,
        progress: subStep.progress,
        status: subStep.status,
        responsible: subStep.responsible || '',
        observations: subStep.observations || '',
      });
      setErrors({});
    }
  }, [isEditing, subStep]);

  const handleChange = (field: keyof SubStep, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    
    updateSubStep(phaseId, subStep.id, formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: subStep.name,
      progress: subStep.progress,
      status: subStep.status,
      responsible: subStep.responsible || '',
      observations: subStep.observations || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    
    removeSubStep(phaseId, subStep.id);
    setShowDeleteConfirm(false);
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'COMPLETED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'IN_PROGRESS': return 'text-blue-500 bg-blue-500/10 border-blue-600/20';
      case 'DELAYED': return 'text-amber-500 bg-amber-500/10 border-amber-600/20';
      case 'BLOCKED': return 'text-rose-500 bg-rose-500/10 border-rose-600/20';
      default: return 'text-slate-500 bg-white/5 border-white/10';
    }
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-white/[0.04] border border-blue-600/30 rounded-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50",
                  errors.name ? "border-rose-500" : "border-white/10"
                )}
              />
              {errors.name && (
                <p className="text-[10px] text-rose-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
              <select
                value={formData.status || 'NOT_STARTED'}
                onChange={(e) => handleChange('status', e.target.value as Status)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
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
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50"
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

          {isExpanded && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Observações</label>
              <textarea
                value={formData.observations || ''}
                onChange={(e) => handleChange('observations', e.target.value)}
                className="w-full h-20 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/50 resize-none"
                placeholder="Observações da sub-etapa..."
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-slate-500 hover:text-white transition-all"
            >
              {isExpanded ? 'Menos informações' : 'Mais informações'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="p-2 text-slate-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
              <button
                onClick={handleSave}
                className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-all"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "group p-4 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all",
      canReorder && "relative"
    )}>
      {canReorder && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
              subStep.progress === 100 
                ? "bg-emerald-500 border-emerald-500 text-white" 
                : "border-white/10 text-transparent hover:border-white/30"
            )}
          >
            <Check size={12} />
          </button>
          
          <div className="min-w-0 flex-1">
            <h4 className="text-white text-sm font-medium truncate">{subStep.name}</h4>
            {subStep.responsible && (
              <p className="text-[10px] text-slate-500 truncate">{subStep.responsible}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-600 uppercase mb-1">Conclusão</p>
            <p className={cn("text-xs font-bold", subStep.progress === 100 ? "text-emerald-500" : "text-slate-400")}>
              {subStep.progress}%
            </p>
          </div>
          
          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-700", 
                subStep.progress === 100 ? "bg-emerald-500" : "bg-blue-600"
              )}
              style={{ width: `${subStep.progress}%` }}
            />
          </div>

          <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border", getStatusColor(subStep.status))}>
            {subStep.status.replace('_', ' ')}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-500 hover:text-blue-500 transition-all"
              >
                <Pencil size={14} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                onBlur={() => setShowDeleteConfirm(false)}
                className={cn(
                  "p-2 transition-all",
                  showDeleteConfirm 
                    ? "text-rose-500 bg-rose-500/10 rounded-lg" 
                    : "text-slate-500 hover:text-rose-500"
                )}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {subStep.observations && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 font-medium">{subStep.observations}</p>
        </div>
      )}
    </div>
  );
}