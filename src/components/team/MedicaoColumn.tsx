'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Medicao, MedicaoStatus } from '@/hooks/useMedicoes';
import MedicaoKanbanCard from './MedicaoKanbanCard';

interface MedicaoColumnProps {
  status: MedicaoStatus;
  title: string;
  accentClass: string;
  medicoes: Medicao[];
  canEdit: boolean;
  onRemove: (id: string) => void;
  onCreateInColumn: (status: MedicaoStatus) => void;
}

export default function MedicaoColumn({
  status,
  title,
  accentClass,
  medicoes,
  canEdit,
  onRemove,
  onCreateInColumn,
}: MedicaoColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const totalColuna = medicoes.reduce((sum, m) => sum + m.valorTotal, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] bg-white/[0.02] rounded-2xl p-4 border-t-4 ${accentClass} ${
        isOver ? 'bg-white/[0.05]' : ''
      } transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {medicoes.length} item(ns) • R$ {totalColuna.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => onCreateInColumn(status)}
            className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5"
            aria-label={`Criar medição em ${title}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="space-y-2 min-h-[100px]">
        {medicoes.map(m => (
          <MedicaoKanbanCard
            key={m.id}
            medicao={m}
            canEdit={canEdit}
            onRemove={onRemove}
          />
        ))}
        {medicoes.length === 0 && (
          <div className="text-center py-6 text-[10px] text-slate-600 italic">
            arraste cards para cá
          </div>
        )}
      </div>
    </div>
  );
}
