'use client';

import { useDraggable } from '@dnd-kit/core';
import { Trash2, User, Clock } from 'lucide-react';
import { Pendencia } from '@/hooks/usePendencias';

interface PendenciaCardProps {
  pendencia: Pendencia;
  canEdit: boolean;
  onRemove: (id: string) => void;
}

export default function PendenciaCard({ pendencia, canEdit, onRemove }: PendenciaCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: pendencia.id,
    data: { pendencia },
  });

  // Card original fica parado durante o drag; o DragOverlay no parent é
  // que segue o cursor. Aplicar transform aqui causaria movimento duplicado.
  const style = {
    opacity: isDragging ? 0 : 1,
  };

  // Indicador de tempo na coluna: badge amarelo se >7 dias desde criação
  const diasDesdeCriacao = Math.floor(
    (Date.now() - new Date(pendencia.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const stale = diasDesdeCriacao > 7 && pendencia.status !== 'concluida';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-grab active:cursor-grabbing transition-colors ${
        stale ? 'border-l-4 border-l-amber-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white flex-1 break-words">{pendencia.conteudo}</p>
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(pendencia.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-500 hover:text-rose-500 shrink-0"
            aria-label="Remover pendência"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <User size={10} /> {pendencia.responsavel || '—'}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={10} /> {new Date(pendencia.createdAt).toLocaleDateString('pt-BR')}
        </span>
        {stale && <span className="text-amber-500 font-bold">{diasDesdeCriacao}d</span>}
      </div>
    </div>
  );
}
