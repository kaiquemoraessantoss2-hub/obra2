'use client';

import { useState } from 'react';
import { X, Check, Layers } from 'lucide-react';
import { Status } from '@/types';

interface BulkEditBarProps {
  selectedCount: number;
  onApply: (status: Status, progress: number) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Não Iniciado' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'DELAYED', label: 'Atrasado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
];

export default function BulkEditBar({ selectedCount, onApply, onCancel }: BulkEditBarProps) {
  const [status, setStatus] = useState<Status>('IN_PROGRESS');
  const [progress, setProgress] = useState(50);

  const handleApply = () => {
    onApply(status, progress);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
      <div className="glass-card px-6 py-4 rounded-2xl border-blue-500/30 bg-blue-600/90 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <Layers size={18} />
            <span className="font-black text-sm">
              {selectedCount} pavimento{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
            </span>
          </div>

          <div className="h-6 w-px bg-white/20" />

          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm font-bold"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm font-bold text-center"
              />
              <span className="text-white/60 text-sm font-bold">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Cancelar seleção"
            >
              <X size={18} className="text-white/60" />
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors"
            >
              <Check size={16} />
              <span className="text-white font-black text-xs">Aplicar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}