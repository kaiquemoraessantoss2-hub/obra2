'use client';

import React, { useState } from 'react';
import { Database, CloudUpload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MigrationTool() {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const startMigration = async () => {
    setStatus('migrating');
    setMessage('Coletando dados locais...');

    try {
      // Coletar dados do localStorage
      const companies = JSON.parse(localStorage.getItem('obraflow_companies') || '[]');
      const projects = JSON.parse(localStorage.getItem('obraflow_projects') || '[]');
      
      // Carregar pavimentos de cada projeto
      const enrichedProjects = projects.map((p: any) => {
        const config = JSON.parse(localStorage.getItem(`project_config_${p.id}`) || 'null');
        return {
          ...p,
          floors: config?.floors || p.floors || []
        };
      });

      setMessage('Enviando dados para o Supabase...');

      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies,
          projects: enrichedProjects,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setMessage('Migração concluída! Todos os seus dados agora estão seguros na nuvem.');
      } else {
        throw new Error(result.error || 'Falha na migração');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
          <Database size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Migração para Nuvem</h2>
          <p className="text-sm text-slate-500">Sincronize seus dados locais com o Supabase.</p>
        </div>
      </div>

      <div className={cn(
        "p-6 rounded-3xl border transition-all",
        status === 'idle' ? "bg-white/[0.02] border-white/5" :
        status === 'migrating' ? "bg-blue-600/5 border-blue-600/20" :
        status === 'success' ? "bg-emerald-500/5 border-emerald-500/20" :
        "bg-rose-500/5 border-rose-500/20"
      )}>
        {status === 'idle' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Esta ferramenta irá ler todas as empresas, projetos e pavimentos salvos neste navegador e enviá-los para o seu novo banco de dados na Supabase. 
              <strong> Isso permite que você acesse seus dados de qualquer dispositivo.</strong>
            </p>
            <button
              onClick={startMigration}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              <CloudUpload size={20} />
              Iniciar Sincronização
            </button>
          </div>
        )}

        {status === 'migrating' && (
          <div className="flex flex-col items-center py-4 space-y-4">
            <Loader2 className="text-blue-500 animate-spin" size={32} />
            <p className="text-sm font-bold text-white animate-pulse">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-4 space-y-3">
            <CheckCircle className="text-emerald-500" size={32} />
            <p className="text-sm font-bold text-white text-center">{message}</p>
            <button 
              onClick={() => setStatus('idle')}
              className="text-xs text-emerald-500 hover:underline font-bold"
            >
              Entendido
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-4 space-y-3">
            <AlertCircle className="text-rose-500" size={32} />
            <p className="text-sm font-bold text-rose-500 text-center">{message}</p>
            <button 
              onClick={() => setStatus('idle')}
              className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
