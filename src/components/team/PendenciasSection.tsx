'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, CheckCircle, Circle, Trash2, User, Clock, List, LayoutGrid } from 'lucide-react';
import { usePendencias, Pendencia } from '@/hooks/usePendencias';

// Re-export para manter compatibilidade com imports legados
export type { Pendencia } from '@/hooks/usePendencias';

// Lazy import do Kanban: não paga @dnd-kit no bundle quando user fica na lista
const PendenciasKanban = dynamic(() => import('./PendenciasKanban'), {
  ssr: false,
  loading: () => <div className="text-center py-8 text-slate-500">Carregando Kanban...</div>,
});

const VIEW_STORAGE_KEY = 'pendencias_view_mode';
type ViewMode = 'list' | 'kanban';

interface PendenciasSectionProps {
  projectId: string;
  currentUserName: string;
  canEdit?: boolean;
}

export default function PendenciasSection({
  projectId,
  currentUserName,
  canEdit = true,
}: PendenciasSectionProps) {
  const { pendencias, adicionar, moverStatus, remover } = usePendencias(projectId, currentUserName);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [novaPendencia, setNovaPendencia] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Carregar preferência de view do localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'list' || saved === 'kanban') setViewMode(saved);
  }, []);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    }
  };

  const adicionarPendencia = async () => {
    const result = await adicionar(novaPendencia, responsavel);
    if (!result.ok && result.error) {
      alert(`Erro ao adicionar: ${result.error}`);
      return;
    }
    setNovaPendencia('');
    setResponsavel('');
    setShowAdd(false);
  };

  const toggleConcluida = async (p: Pendencia) => {
    const novoStatus = p.status === 'concluida' ? 'a_fazer' : 'concluida';
    const result = await moverStatus(p.id, novoStatus);
    if (!result.ok && result.error) alert(`Erro: ${result.error}`);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta pendência?')) return;
    const result = await remover(id);
    if (!result.ok && result.error) alert(`Erro: ${result.error}`);
  };

  const pendenciasAbertas = pendencias.filter(p => p.status !== 'concluida');
  const pendenciasConcluidas = pendencias.filter(p => p.status === 'concluida');

  return (
    <div className="glass-card p-8 rounded-[40px] space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Pendências</h2>
          <p className="text-sm text-slate-500">
            {pendenciasAbertas.length} aberta(s), {pendenciasConcluidas.length} concluída(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => switchView('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}
              aria-pressed={viewMode === 'list'}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => switchView('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}
              aria-pressed={viewMode === 'kanban'}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
          {canEdit && viewMode === 'list' && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
            >
              <Plus size={18} /> Nova
            </button>
          )}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <PendenciasKanban
          projectId={projectId}
          currentUserName={currentUserName}
          canEdit={canEdit}
        />
      ) : (
        <>
          {showAdd && (
            <div className="p-4 bg-white/5 rounded-xl space-y-4">
              <textarea
                value={novaPendencia}
                onChange={(e) => setNovaPendencia(e.target.value)}
                placeholder="Descreva a pendência..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
                rows={3}
              />
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Responsável (opcional)"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 text-slate-500 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarPendencia}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {pendencias.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhuma pendência ainda.</div>
          ) : (
            <div className="space-y-3">
              {pendenciasAbertas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Abertas</h3>
                  <div className="space-y-2">
                    {pendenciasAbertas.map(p => (
                      <div key={p.id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                        <button onClick={() => toggleConcluida(p)} className="mt-1">
                          <Circle size={20} className="text-amber-500" />
                        </button>
                        <div className="flex-1">
                          <p className="text-white">{p.conteudo}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User size={12} /> {p.responsavel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleRemove(p.id)}
                            className="text-slate-500 hover:text-rose-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendenciasConcluidas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Concluídas</h3>
                  <div className="space-y-2">
                    {pendenciasConcluidas.map(p => (
                      <div
                        key={p.id}
                        className="flex items-start gap-3 p-4 bg-white/5 rounded-xl opacity-60"
                      >
                        <button onClick={() => toggleConcluida(p)} className="mt-1">
                          <CheckCircle size={20} className="text-green-500" />
                        </button>
                        <div className="flex-1">
                          <p className="text-white line-through">{p.conteudo}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <User size={12} /> {p.responsavel}
                            </span>
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle size={12} /> Concluída por {p.concluidaPor} em{' '}
                              {p.concluidaEm
                                ? new Date(p.concluidaEm).toLocaleDateString('pt-BR')
                                : ''}
                            </span>
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleRemove(p.id)}
                            className="text-slate-500 hover:text-rose-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
