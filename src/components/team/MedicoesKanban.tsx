'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useMedicoes, MedicaoStatus, Medicao } from '@/hooks/useMedicoes';
import MedicaoColumn from './MedicaoColumn';

const COLUMNS: Array<{ status: MedicaoStatus; title: string; accentClass: string }> = [
  { status: 'lancada', title: 'Lançada', accentClass: 'border-slate-500' },
  { status: 'em_analise', title: 'Em análise', accentClass: 'border-blue-500' },
  { status: 'aprovada', title: 'Aprovada', accentClass: 'border-emerald-500' },
  { status: 'paga', title: 'Paga', accentClass: 'border-violet-500' },
];

const DISCIPLINAS = ['Elétrica', 'Hidráulica', 'Alvenaria', 'Revestimento', 'Pintura', 'Gás', 'Dados', 'Incêndio'];

interface MedicoesKanbanProps {
  projectId: string;
  currentUserName: string;
  canEdit: boolean;
}

export default function MedicoesKanban({
  projectId,
  currentUserName,
  canEdit,
}: MedicoesKanbanProps) {
  const { medicoes, adicionar, moverStatus, remover } = useMedicoes(projectId, currentUserName);
  const [createInColumn, setCreateInColumn] = useState<MedicaoStatus | null>(null);
  const [form, setForm] = useState({
    disciplina: '',
    contratante: '',
    descricao: '',
    quantidade: '',
    unidade: '',
    valorUnitario: '',
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) return;
    const id = String(event.active.id);
    const newStatus = event.over.id as MedicaoStatus;
    const result = await moverStatus(id, newStatus);
    if (!result.ok && result.error) alert(`Erro ao mover: ${result.error}`);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta medição?')) return;
    const result = await remover(id);
    if (!result.ok && result.error) alert(`Erro ao remover: ${result.error}`);
  };

  const resetForm = () => {
    setForm({
      disciplina: '',
      contratante: '',
      descricao: '',
      quantidade: '',
      unidade: '',
      valorUnitario: '',
    });
  };

  const handleCreateSubmit = async () => {
    if (!createInColumn) return;
    const quantidade = parseFloat(form.quantidade.replace(',', '.'));
    const valorUnitario = parseFloat(form.valorUnitario.replace(',', '.'));
    const result = await adicionar(
      {
        disciplina: form.disciplina,
        contratante: form.contratante,
        descricao: form.descricao,
        quantidade,
        unidade: form.unidade,
        valorUnitario,
      },
      createInColumn,
    );
    if (!result.ok && result.error) {
      alert(`Erro: ${result.error}`);
      return;
    }
    resetForm();
    setCreateInColumn(null);
  };

  const medicoesByStatus = (status: MedicaoStatus): Medicao[] =>
    medicoes.filter(m => m.status === status);

  // Disciplinas vistas até hoje (lista padrão + qualquer extra que o usuário já lançou)
  const disciplinasUsadas = [
    ...new Set([...DISCIPLINAS, ...medicoes.map(m => m.disciplina).filter(Boolean)]),
  ];

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <MedicaoColumn
              key={col.status}
              status={col.status}
              title={col.title}
              accentClass={col.accentClass}
              medicoes={medicoesByStatus(col.status)}
              canEdit={canEdit}
              onRemove={handleRemove}
              onCreateInColumn={(s) => setCreateInColumn(s)}
            />
          ))}
        </div>
      </DndContext>

      {createInColumn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              <h3 className="text-lg font-bold text-white">
                Nova medição em &quot;{COLUMNS.find(c => c.status === createInColumn)?.title}&quot;
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                list="kanban-disciplinas-suggestions"
                value={form.disciplina}
                onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
                placeholder="Disciplina (ex: Elétrica, Forro PVC, etc)"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <input
                type="text"
                value={form.contratante}
                onChange={(e) => setForm({ ...form, contratante: e.target.value })}
                placeholder="Contratante"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <datalist id="kanban-disciplinas-suggestions">
              {disciplinasUsadas.map(d => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descrição do serviço"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                placeholder="Quantidade"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <input
                type="text"
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                placeholder="Unidade (m, m², etc)"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <input
                type="text"
                value={form.valorUnitario}
                onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                placeholder="Valor Unitário (R$)"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCreateInColumn(null);
                  resetForm();
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
