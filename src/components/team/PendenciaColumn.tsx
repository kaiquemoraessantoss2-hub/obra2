'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Pendencia, PendenciaStatus } from '@/hooks/usePendencias';
import PendenciaCard from './PendenciaCard';

interface PendenciaColumnProps {
  status: PendenciaStatus;
  title: string;
  accentClass: string; // ex: 'border-blue-500'
  pendencias: Pendencia[];
  canEdit: boolean;
  onRemove: (id: string) => void;
  onCreateInColumn: (status: PendenciaStatus) => void;
}

export default function PendenciaColumn({
  status,
  title,
  accentClass,
  pendencias,
  canEdit,
  onRemove,
  onCreateInColumn,
}: PendenciaColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] bg-white/[0.02] rounded-2xl p-4 border-t-4 ${accentClass} ${
        isOver ? 'bg-white/[0.05]' : ''
      } transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{pendencias.length} item(ns)</p>
        </div>
        {canEdit && (
          <button
            onClick={() => onCreateInColumn(status)}
            className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5"
            aria-label={`Criar pendência em ${title}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="space-y-2 min-h-[100px]">
        {pendencias.map(p => (
          <PendenciaCard
            key={p.id}
            pendencia={p}
            canEdit={canEdit}
            onRemove={onRemove}
          />
        ))}
        {pendencias.length === 0 && (
          <div className="text-center py-6 text-[10px] text-slate-600 italic">
            arraste cards para cá
          </div>
        )}
      </div>
    </div>
  );
}
