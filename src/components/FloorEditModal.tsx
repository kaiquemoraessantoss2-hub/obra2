'use client';

import { useState, useEffect } from 'react';
import { X, Pencil, Trash2, AlertTriangle, Check } from 'lucide-react';
import { Floor, FloorType, FloorExecution } from '@/types';

interface FloorEditModalProps {
  isOpen: boolean;
  floor: Floor | null;
  onSave: (floor: Floor) => void;
  onDelete?: (floorId: string) => void;
  onClose: () => void;
  hasExecutions?: boolean;
}

const FLOOR_TYPE_OPTIONS: { value: FloorType; label: string }[] = [
  { value: 'BASEMENT', label: 'Subsolo' },
  { value: 'GROUND', label: 'Térreo' },
  { value: 'LEISURE', label: 'Lazer' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'TECHNICAL', label: 'Técnico' },
  { value: 'ATRIUM', label: 'Átrio' },
  { value: 'ROOFTOP', label: 'Cobertura' },
];

export default function FloorEditModal({ 
  isOpen, 
  floor, 
  onSave, 
  onDelete,
  onClose,
  hasExecutions = false 
}: FloorEditModalProps) {
  const [formData, setFormData] = useState<Floor | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (floor) {
      setFormData({ ...floor });
    }
  }, [floor, isOpen]);

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (hasExecutions && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (floor && onDelete) {
      onDelete(floor.id);
      onClose();
    }
  };

  const getTypeColor = (type: FloorType) => {
    switch (type) {
      case 'BASEMENT': return 'bg-slate-700/50 text-slate-400 border-slate-600';
      case 'GROUND': return 'bg-blue-600/20 text-blue-400 border-blue-600';
      case 'LEISURE': return 'bg-purple-600/20 text-purple-400 border-purple-600';
      case 'REGULAR': return 'bg-emerald-600/20 text-emerald-400 border-emerald-600';
      case 'TECHNICAL': return 'bg-amber-600/20 text-amber-400 border-amber-600';
      case 'ATRIUM': return 'bg-orange-600/20 text-orange-400 border-orange-600';
      case 'ROOFTOP': return 'bg-cyan-600/20 text-cyan-400 border-cyan-600';
      default: return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-lg p-8 rounded-[40px] border-white/5 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center">
            <Pencil className="text-emerald-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Editar Pavimento</h2>
            <p className="text-slate-500 text-sm">Atualize as informações deste andar</p>
          </div>
        </div>

        {confirmDelete && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-rose-500" size={18} />
              <p className="text-rose-500 font-black text-sm">Confirmar remoção</p>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              Este andar possui registros de execução. Deseja remover mesmo assim? Todos os dados serão perdidos.
            </p>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-slate-400 text-sm font-bold hover:underline mr-4"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="text-rose-500 text-sm font-bold hover:underline"
            >
              Sim, remover
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-center mb-6">
            <div className={`px-6 py-3 rounded-2xl border-2 ${getTypeColor(formData.type)} font-black text-lg`}>
              {formData.label}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 ml-1 uppercase">Nome/Label</label>
            <input
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as FloorType })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
              >
                {FLOOR_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase">Número</label>
              <input
                type="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="floorActive"
              checked={formData.services && formData.services.length > 0}
              onChange={(e) => {
                if (e.target.checked && !formData.services?.length) {
                  setFormData({
                    ...formData,
                    services: []
                  });
                }
              }}
              className="w-5 h-5 accent-blue-600"
            />
            <label htmlFor="floorActive" className="text-white font-bold">
              Ativo (visível na matriz)
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-8 mt-8 border-t border-white/5">
          {onDelete && (
            <button
              onClick={handleDelete}
              className="px-6 py-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2"
            >
              <Trash2 size={16} />
              Remover
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2"
          >
            <Check size={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}