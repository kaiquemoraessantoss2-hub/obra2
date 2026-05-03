'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Circle, Trash2, User, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface Pendencia {
  id: string;
  projectId: string;
  conteudo: string;
  responsavel: string;
  nomeMembro: string;
  createdAt: string;
  concluida: boolean;
  concluidaPor?: string;
  concluidaEm?: string;
}

async function fetchPendencias(projectId: string): Promise<Pendencia[]> {
  const { data, error } = await supabase
    .from('pendencias')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    conteudo: r.conteudo,
    responsavel: r.responsavel ?? '',
    nomeMembro: r.nome_membro ?? '',
    createdAt: r.created_at,
    concluida: r.concluida,
    concluidaPor: r.concluida_por,
    concluidaEm: r.concluida_em,
  }));
}

interface PendenciasSectionProps {
  projectId: string;
  currentUserName: string;
  canEdit?: boolean;
}

export default function PendenciasSection({ 
  projectId, 
  currentUserName, 
  canEdit = true 
}: PendenciasSectionProps) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [novaPendencia, setNovaPendencia] = useState('');
  const [responsavel, setResponsavel] = useState('');

  useEffect(() => {
    fetchPendencias(projectId).then(setPendencias);
  }, [projectId]);

  const adicionarPendencia = async () => {
    if (!novaPendencia.trim()) return;
    const { data, error } = await supabase.from('pendencias').insert({
      project_id: projectId,
      conteudo: novaPendencia.trim(),
      responsavel: responsavel.trim() || currentUserName,
      nome_membro: currentUserName,
      concluida: false,
    }).select().maybeSingle();
    if (error || !data) return;
    setPendencias(prev => [...prev, {
      id: data.id, projectId: data.project_id, conteudo: data.conteudo,
      responsavel: data.responsavel ?? '', nomeMembro: data.nome_membro ?? '',
      createdAt: data.created_at, concluida: data.concluida,
    }]);
    setNovaPendencia('');
    setResponsavel('');
    setShowAdd(false);
  };

  const toggleConcluida = async (id: string) => {
    const p = pendencias.find(p => p.id === id);
    if (!p) return;
    const novaConcluida = !p.concluida;
    await supabase.from('pendencias').update({
      concluida: novaConcluida,
      concluida_por: novaConcluida ? currentUserName : null,
      concluida_em: novaConcluida ? new Date().toISOString() : null,
    }).eq('id', id);
    setPendencias(prev => prev.map(item => item.id !== id ? item : {
      ...item,
      concluida: novaConcluida,
      concluidaPor: novaConcluida ? currentUserName : undefined,
      concluidaEm: novaConcluida ? new Date().toISOString() : undefined,
    }));
  };

  const removerPendencia = async (id: string) => {
    if (!confirm('Remover esta pendência?')) return;
    await supabase.from('pendencias').delete().eq('id', id);
    setPendencias(prev => prev.filter(p => p.id !== id));
  };

  const pendenciasAbertas = pendencias.filter(p => !p.concluida);
  const pendenciasConcluidas = pendencias.filter(p => p.concluida);

  return (
    <div className="glass-card p-8 rounded-[40px] space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Pendências</h2>
          <p className="text-sm text-slate-500">{pendenciasAbertas.length} aberta(s), {pendenciasConcluidas.length} concluída(s)</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            <Plus size={18} /> Nova
          </button>
        )}
      </div>

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
        <div className="text-center py-8 text-slate-500">
          Nenhuma pendência ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {pendenciasAbertas.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Abertas</h3>
              <div className="space-y-2">
                {pendenciasAbertas.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                    <button onClick={() => toggleConcluida(p.id)} className="mt-1">
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
                      <button onClick={() => removerPendencia(p.id)} className="text-slate-500 hover:text-rose-500">
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
                  <div key={p.id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl opacity-60">
                    <button onClick={() => toggleConcluida(p.id)} className="mt-1">
                      <CheckCircle size={20} className="text-green-500" />
                    </button>
                    <div className="flex-1">
                      <p className="text-white line-through">{p.conteudo}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={12} /> {p.responsavel}
                        </span>
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle size={12} /> Concluída por {p.concluidaPor} em {p.concluidaEm ? new Date(p.concluidaEm).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => removerPendencia(p.id)} className="text-slate-500 hover:text-rose-500">
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
    </div>
  );
}