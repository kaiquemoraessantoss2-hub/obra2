'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';

export type MedicaoStatus = 'lancada' | 'em_analise' | 'aprovada' | 'paga';

export interface Medicao {
  id: string;
  projectId: string;
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  createdBy: string;
  status: MedicaoStatus;
  aprovadaPor?: string;
  aprovadaEm?: string;
  pagaEm?: string;
}

interface RawMedicao {
  id: string;
  project_id: string;
  disciplina: string;
  contratante: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  created_by: string | null;
  status?: MedicaoStatus | null;
  aprovada_por?: string | null;
  aprovada_em?: string | null;
  paga_em?: string | null;
}

function mapRow(r: RawMedicao): Medicao {
  return {
    id: r.id,
    projectId: r.project_id,
    disciplina: r.disciplina,
    contratante: r.contratante ?? '',
    descricao: r.descricao,
    quantidade: r.quantidade,
    unidade: r.unidade ?? '',
    valorUnitario: r.valor_unitario,
    valorTotal: r.valor_total,
    createdAt: r.created_at,
    createdBy: r.created_by ?? '',
    // Fallback: se migration 014 ainda não foi aplicada, derivar status como 'lancada'
    status: r.status ?? 'lancada',
    aprovadaPor: r.aprovada_por ?? undefined,
    aprovadaEm: r.aprovada_em ?? undefined,
    pagaEm: r.paga_em ?? undefined,
  };
}

export interface NovaMedicaoInput {
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
}

export function useMedicoes(projectId: string, currentUserName: string) {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Medicao[]>([]);
  ref.current = medicoes;

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('medicoes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setMedicoes((data ?? []).map(mapRow));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: nome único por mount evita colisão com cache de channels do supabase-js
  // quando React 19 StrictMode faz double-mount em dev (lição do Plan A).
  useEffect(() => {
    if (!projectId) return;
    const channelName = `medicoes:${projectId}:${
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medicoes', filter: `project_id=eq.${projectId}` },
        () => {
          refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, refetch]);

  const adicionar = useCallback(
    async (
      input: NovaMedicaoInput,
      initialStatus: MedicaoStatus = 'lancada',
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!input.disciplina || !input.descricao) {
        return { ok: false, error: 'Disciplina e descrição são obrigatórios.' };
      }
      if (Number.isNaN(input.quantidade) || Number.isNaN(input.valorUnitario)) {
        return { ok: false, error: 'Quantidade e valor unitário inválidos.' };
      }
      if (!projectId) return { ok: false, error: 'Selecione um projeto.' };
      const { data, error: insertError } = await supabase
        .from('medicoes')
        .insert({
          id: newId(),
          project_id: projectId,
          disciplina: input.disciplina,
          contratante: input.contratante,
          descricao: input.descricao,
          quantidade: input.quantidade,
          unidade: input.unidade,
          valor_unitario: input.valorUnitario,
          valor_total: input.quantidade * input.valorUnitario,
          created_by: currentUserName,
          status: initialStatus,
        })
        .select()
        .maybeSingle();
      if (insertError) return { ok: false, error: insertError.message };
      if (!data) return { ok: false, error: 'Sem permissão para criar medição.' };
      setMedicoes(prev => [...prev, mapRow(data as RawMedicao)]);
      return { ok: true };
    },
    [projectId, currentUserName],
  );

  const moverStatus = useCallback(
    async (id: string, novoStatus: MedicaoStatus): Promise<{ ok: boolean; error?: string }> => {
      const previous = ref.current;
      const target = previous.find(m => m.id === id);
      if (!target) return { ok: false, error: 'Medição não encontrada.' };
      if (target.status === novoStatus) return { ok: true };

      const nowIso = new Date().toISOString();

      // Update otimista
      setMedicoes(prev =>
        prev.map(m => {
          if (m.id !== id) return m;
          return {
            ...m,
            status: novoStatus,
            aprovadaPor: novoStatus === 'aprovada' || novoStatus === 'paga' ? (m.aprovadaPor ?? currentUserName) : m.aprovadaPor,
            aprovadaEm: novoStatus === 'aprovada' || novoStatus === 'paga' ? (m.aprovadaEm ?? nowIso) : m.aprovadaEm,
            pagaEm: novoStatus === 'paga' ? (m.pagaEm ?? nowIso) : (novoStatus === 'lancada' || novoStatus === 'em_analise' || novoStatus === 'aprovada' ? undefined : m.pagaEm),
          };
        }),
      );

      const updateBody: Record<string, unknown> = { status: novoStatus };
      if (novoStatus === 'aprovada' && !target.aprovadaEm) {
        updateBody.aprovada_por = currentUserName;
        updateBody.aprovada_em = nowIso;
      }
      if (novoStatus === 'paga' && !target.pagaEm) {
        updateBody.paga_em = nowIso;
        // Se aprovou direto, registra também
        if (!target.aprovadaEm) {
          updateBody.aprovada_por = currentUserName;
          updateBody.aprovada_em = nowIso;
        }
      }
      // Voltando atrás de paga, limpa paga_em
      if (target.status === 'paga' && novoStatus !== 'paga') {
        updateBody.paga_em = null;
      }

      const { error: updateError } = await supabase.from('medicoes').update(updateBody).eq('id', id);
      if (updateError) {
        setMedicoes(previous);
        return { ok: false, error: updateError.message };
      }
      return { ok: true };
    },
    [currentUserName],
  );

  const remover = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const previous = ref.current;
      setMedicoes(prev => prev.filter(m => m.id !== id));
      const { error: deleteError } = await supabase.from('medicoes').delete().eq('id', id);
      if (deleteError) {
        setMedicoes(previous);
        return { ok: false, error: deleteError.message };
      }
      return { ok: true };
    },
    [],
  );

  return { medicoes, loading, error, adicionar, moverStatus, remover, refetch };
}
