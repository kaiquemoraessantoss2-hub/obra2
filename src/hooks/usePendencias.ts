'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';

export type PendenciaStatus = 'a_fazer' | 'em_andamento' | 'aguardando_aprovacao' | 'concluida';

export interface Pendencia {
  id: string;
  projectId: string;
  conteudo: string;
  responsavel: string;
  nomeMembro: string;
  createdAt: string;
  status: PendenciaStatus;
  concluida: boolean;
  concluidaPor?: string;
  concluidaEm?: string;
}

interface RawPendencia {
  id: string;
  project_id: string;
  conteudo: string;
  responsavel: string | null;
  nome_membro: string | null;
  created_at: string;
  status?: PendenciaStatus | null;
  concluida: boolean;
  concluida_por?: string | null;
  concluida_em?: string | null;
}

function mapRow(r: RawPendencia): Pendencia {
  // Fallback: se migration 013 ainda não foi aplicada, derivar status de `concluida`
  const status: PendenciaStatus = r.status ?? (r.concluida ? 'concluida' : 'a_fazer');
  return {
    id: r.id,
    projectId: r.project_id,
    conteudo: r.conteudo,
    responsavel: r.responsavel ?? '',
    nomeMembro: r.nome_membro ?? '',
    createdAt: r.created_at,
    status,
    concluida: r.concluida,
    concluidaPor: r.concluida_por ?? undefined,
    concluidaEm: r.concluida_em ?? undefined,
  };
}

export function usePendencias(projectId: string, currentUserName: string) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mantém referência mais recente para uso dentro de callbacks de realtime
  const pendenciasRef = useRef<Pendencia[]>([]);
  pendenciasRef.current = pendencias;

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('pendencias')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setPendencias((data ?? []).map(mapRow));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: re-fetch quando muda algo na tabela pra esse project.
  // Nome único por mount evita colisão com cache de channels do supabase-js
  // quando React 19 StrictMode faz double-mount em dev.
  useEffect(() => {
    if (!projectId) return;
    const channelName = `pendencias:${projectId}:${
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    }`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pendencias', filter: `project_id=eq.${projectId}` },
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
      conteudo: string,
      responsavel: string,
      initialStatus: PendenciaStatus = 'a_fazer',
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!conteudo.trim()) return { ok: false, error: 'Descreva a pendência.' };
      if (!projectId) return { ok: false, error: 'Selecione um projeto.' };
      const { data, error: insertError } = await supabase
        .from('pendencias')
        .insert({
          id: newId(),
          project_id: projectId,
          conteudo: conteudo.trim(),
          responsavel: responsavel.trim() || currentUserName,
          nome_membro: currentUserName,
          concluida: initialStatus === 'concluida',
          status: initialStatus,
        })
        .select()
        .maybeSingle();
      if (insertError) return { ok: false, error: insertError.message };
      if (!data) return { ok: false, error: 'Sem permissão para criar pendência.' };
      setPendencias(prev => [...prev, mapRow(data as RawPendencia)]);
      return { ok: true };
    },
    [projectId, currentUserName],
  );

  const moverStatus = useCallback(
    async (
      id: string,
      novoStatus: PendenciaStatus,
    ): Promise<{ ok: boolean; error?: string }> => {
      const previous = pendenciasRef.current;
      const target = previous.find(p => p.id === id);
      if (!target) return { ok: false, error: 'Pendência não encontrada.' };
      if (target.status === novoStatus) return { ok: true };

      // Update otimista
      setPendencias(prev =>
        prev.map(p =>
          p.id !== id
            ? p
            : {
                ...p,
                status: novoStatus,
                concluida: novoStatus === 'concluida',
                concluidaPor: novoStatus === 'concluida' ? currentUserName : undefined,
                concluidaEm: novoStatus === 'concluida' ? new Date().toISOString() : undefined,
              },
        ),
      );

      const { error: updateError } = await supabase
        .from('pendencias')
        .update({
          status: novoStatus,
          concluida_por: novoStatus === 'concluida' ? currentUserName : null,
        })
        .eq('id', id);

      if (updateError) {
        // Reverter
        setPendencias(previous);
        return { ok: false, error: updateError.message };
      }
      return { ok: true };
    },
    [currentUserName],
  );

  const remover = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const previous = pendenciasRef.current;
      setPendencias(prev => prev.filter(p => p.id !== id));
      const { error: deleteError } = await supabase.from('pendencias').delete().eq('id', id);
      if (deleteError) {
        setPendencias(previous);
        return { ok: false, error: deleteError.message };
      }
      return { ok: true };
    },
    [],
  );

  return { pendencias, loading, error, adicionar, moverStatus, remover, refetch };
}
