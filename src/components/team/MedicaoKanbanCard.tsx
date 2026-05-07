'use client';

import { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, User, Tag } from 'lucide-react';
import { Medicao } from '@/hooks/useMedicoes';

interface MedicaoKanbanCardProps {
  medicao: Medicao;
  canEdit: boolean;
  onRemove: (id: string) => void;
}

const DISCIPLINA_COLORS: Record<string, string> = {
  'Elétrica': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Hidráulica': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Alvenaria': 'bg-stone-500/20 text-stone-300 border-stone-500/30',
  'Revestimento': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Pintura': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'Gás': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Dados': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Incêndio': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

export default function MedicaoKanbanCard({ medicao, canEdit, onRemove }: MedicaoKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: medicao.id,
    data: { medicao },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  const disciplinaClass = DISCIPLINA_COLORS[medicao.disciplina] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${disciplinaClass}`}>
          <Tag size={10} className="inline mr-1" /> {medicao.disciplina}
        </span>
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(medicao.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-500 hover:text-rose-500 shrink-0"
            aria-label="Remover medição"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="text-sm text-white break-words mb-2">{medicao.descricao}</p>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          {medicao.quantidade} {medicao.unidade} × R$ {medicao.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-emerald-400 font-bold">
          R$ {medicao.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
      {medicao.contratante && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
          <User size={10} /> {medicao.contratante}
        </div>
      )}
    </div>
  );
}
