'use client';

import { useState, useEffect } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import { FloorExecution, Status } from '@/types';

interface FloorExecutionEditRowProps {
  execution: FloorExecution;
  onSave: (updated: FloorExecution) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Não Iniciado' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'DELAYED', label: 'Atrasado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
];

const UNIT_OPTIONS = ['m', 'm²', 'm³', 'ponto', 'peça', 'und', 'kg', 'litro'];

export default function FloorExecutionEditRow({ execution, onSave, onCancel, isNew }: FloorExecutionEditRowProps) {
  const [formData, setFormData] = useState<FloorExecution>(execution);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(execution));
  }, [formData, execution]);

  const handleSave = () => {
    if (formData.progress === 100 && formData.status !== 'COMPLETED') {
      setShowConfirm(true);
      return;
    }
    if (formData.progress < 100 && formData.status === 'COMPLETED') {
      setShowConfirm(true);
      return;
    }
    onSave(formData);
  };

  const handleConfirmYes = () => {
    const updated = { ...formData };
    if (formData.progress === 100 && formData.status !== 'COMPLETED') {
      updated.status = 'COMPLETED';
    }
    if (formData.progress < 100 && formData.status === 'COMPLETED') {
      updated.progress = 100;
    }
    onSave(updated);
  };

  const updateField = (field: keyof FloorExecution, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black text-white flex items-center gap-2">
          <Pencil size={14} className="text-blue-500" />
          {isNew ? 'Nova Execução' : 'Editar'} — {execution.floorLabel}
        </h4>
        {hasChanges && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Alterações pendentes" />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Status</label>
          <select
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value as Status)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Progresso</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={formData.progress}
              onChange={(e) => updateField('progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
            />
            <span className="text-slate-500 text-sm">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Data Início</label>
          <input
            type="date"
            value={formData.startDate || ''}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Data Conclusão</label>
          <input
            type="date"
            value={formData.endDate || ''}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Qtd Medida</label>
          <input
            type="number"
            min={0}
            value={formData.measuredQuantity || 0}
            onChange={(e) => updateField('measuredQuantity', parseFloat(e.target.value) || 0)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Qtd Total</label>
          <input
            type="number"
            min={0}
            value={formData.totalQuantity || 0}
            onChange={(e) => updateField('totalQuantity', parseFloat(e.target.value) || 0)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Unidade</label>
          <select
            value={formData.unit || 'm²'}
            onChange={(e) => updateField('unit', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
          >
            {UNIT_OPTIONS.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase">Medido Por</label>
          <input
            type="text"
            value={formData.measuredBy || ''}
            onChange={(e) => updateField('measuredBy', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold"
            placeholder="Técnico"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase">Observações</label>
        <textarea
          value={formData.observations || ''}
          onChange={(e) => updateField('observations', e.target.value)}
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold resize-none h-20"
          placeholder="Observações sobre a execução..."
        />
      </div>

      {showConfirm && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-500 text-sm font-bold mb-3">
            {formData.progress === 100 && formData.status !== 'COMPLETED' 
              ? 'Deseja atualizar o status para Concluído?' 
              : 'Deseja marcar o progresso como 100%?'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs font-bold"
            >
              Não
            </button>
            <button
              onClick={handleConfirmYes}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold"
            >
              Sim
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <X size={14} /> Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Save size={14} /> Salvar
        </button>
      </div>
    </div>
  );
}