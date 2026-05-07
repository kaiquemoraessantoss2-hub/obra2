'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { usePendencias, PendenciaStatus, Pendencia } from '@/hooks/usePendencias';
import PendenciaColumn from './PendenciaColumn';
import PendenciaCard from './PendenciaCard';

const COLUMNS: Array<{ status: PendenciaStatus; title: string; accentClass: string }> = [
  { status: 'a_fazer', title: 'A fazer', accentClass: 'border-slate-500' },
  { status: 'em_andamento', title: 'Em andamento', accentClass: 'border-blue-500' },
  { status: 'aguardando_aprovacao', title: 'Aguardando aprovação', accentClass: 'border-amber-500' },
  { status: 'concluida', title: 'Concluída', accentClass: 'border-emerald-500' },
];

interface PendenciasKanbanProps {
  projectId: string;
  currentUserName: string;
  canEdit: boolean;
}

export default function PendenciasKanban({
  projectId,
  currentUserName,
  canEdit,
}: PendenciasKanbanProps) {
  const { pendencias, adicionar, moverStatus, remover } = usePendencias(projectId, currentUserName);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createInColumn, setCreateInColumn] = useState<PendenciaStatus | null>(null);
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');

  // PointerSensor com distância de 5px pra não confundir click no botão de remover com drag
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activePendencia = activeId ? pendencias.find(p => p.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over) return;
    const id = String(event.active.id);
    const newStatus = event.over.id as PendenciaStatus;
    const result = await moverStatus(id, newStatus);
    if (!result.ok && result.error) alert(`Erro ao mover: ${result.error}`);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta pendência?')) return;
    const result = await remover(id);
    if (!result.ok && result.error) alert(`Erro ao remover: ${result.error}`);
  };

  const handleCreateSubmit = async () => {
    if (!createInColumn) return;
    const result = await adicionar(novoConteudo, novoResponsavel, createInColumn);
    if (!result.ok && result.error) {
      alert(`Erro: ${result.error}`);
      return;
    }
    setNovoConteudo('');
    setNovoResponsavel('');
    setCreateInColumn(null);
  };

  const pendenciasByStatus = (status: PendenciaStatus): Pendencia[] =>
    pendencias.filter(p => p.status === status);

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <PendenciaColumn
              key={col.status}
              status={col.status}
              title={col.title}
              accentClass={col.accentClass}
              pendencias={pendenciasByStatus(col.status)}
              canEdit={canEdit}
              onRemove={handleRemove}
              onCreateInColumn={(s) => setCreateInColumn(s)}
            />
          ))}
        </div>
        <DragOverlay>
          {activePendencia ? (
            <PendenciaCard pendencia={activePendencia} canEdit={false} onRemove={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {createInColumn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              <h3 className="text-lg font-bold text-white">
                Nova pendência em &quot;{COLUMNS.find(c => c.status === createInColumn)?.title}&quot;
              </h3>
            </div>
            <textarea
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              placeholder="Descreva a pendência..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
              rows={3}
              autoFocus
            />
            <input
              type="text"
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              placeholder="Responsável (opcional)"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCreateInColumn(null);
                  setNovoConteudo('');
                  setNovoResponsavel('');
                }}
                className="flex-1 py-2 text-slate-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSubmit}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
