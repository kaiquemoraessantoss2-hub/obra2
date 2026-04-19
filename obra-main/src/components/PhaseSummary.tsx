'use client';

import React from 'react';
import { FileText, Box, Layers, Building, Zap, Droplets, CheckCircle, Users, Shield, Clock, AlertTriangle, TrendingUp, Calendar, Plus } from 'lucide-react';
import { ConstructionPhase } from '@/types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  FileText, Box, Layers, Building, Zap, Droplets, CheckCircle, Users, Shield
};

interface PhaseSummaryProps {
  phases: ConstructionPhase[];
  onAddPhase?: () => void;
}

export default function PhaseSummary({ phases, onAddPhase }: PhaseSummaryProps) {
  const overallProgress = phases.length > 0 
    ? Math.round(phases.reduce((acc, p) => acc + p.progress, 0) / phases.length) 
    : 0;

  const validPhases = phases.filter(p => p.name && p.status);
  const phasesConcluidas = validPhases.filter(p => p.status === 'COMPLETED').length;
  const fasesEmAndamento = validPhases.filter(p => p.status === 'IN_PROGRESS').length;
  const fasesAtrasadas = validPhases.filter(p => p.status === 'DELAYED').length;
  const totalSubSteps = validPhases.reduce((acc, p) => acc + (p.subSteps?.length || 0), 0);
  const subStepsConcluidas = validPhases.reduce((acc, p) => acc + (p.subSteps?.filter(s => s.status === 'COMPLETED').length || 0), 0);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Concluída';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'NOT_STARTED': return 'Não Iniciada';
      case 'DELAYED': return 'Atrasada';
      case 'BLOCKED': return 'Bloqueada';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'NOT_STARTED': return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
      case 'DELAYED': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'BLOCKED': return 'bg-rose-500/20 text-rose-500 border-rose-500/30';
      default: return 'bg-slate-500/20 text-slate-500 border-slate-500/30';
    }
  };

  const projectHasPhases = phases && phases.length > 0 && phases.some(p => p.name && p.status);

  if (!projectHasPhases) {
    return (
      onAddPhase ? (
        <div className="glass-card p-8 rounded-[40px] border border-white/5 text-center">
          <p className="text-slate-500 text-center mb-4">Nenhuma fase cadastrada</p>
          <button 
            onClick={onAddPhase}
            className="flex items-center justify-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            <Plus size={18} />
            Adicionar Primeira Fase
          </button>
        </div>
      ) : (
        <div className="glass-card p-8 rounded-[40px] border border-white/5">
          <p className="text-slate-500 text-center">Nenhuma fase cadastrada</p>
        </div>
      )
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <TrendingUp size={16} className="text-blue-500" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase">Geral</span>
          </div>
          <p className="text-2xl font-black text-white">{overallProgress}%</p>
          <p className="text-[10px] text-slate-500">Progresso Total</p>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase">Fases</span>
          </div>
          <p className="text-2xl font-black text-emerald-500">{phasesConcluidas}/{phases.length}</p>
          <p className="text-[10px] text-slate-500">Concluídas</p>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <Clock size={16} className="text-amber-500" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase">Atrasos</span>
          </div>
          <p className="text-2xl font-black text-amber-500">{fasesAtrasadas}</p>
          <p className="text-[10px] text-slate-500">Fases atrasadas</p>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Box size={16} className="text-violet-500" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase">Sub-etapas</span>
          </div>
          <p className="text-2xl font-black text-violet-500">{subStepsConcluidas}/{totalSubSteps}</p>
          <p className="text-[10px] text-slate-500">Concluídas</p>
        </div>
      </div>

      {/* Lista de fases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {validPhases.slice(0, 6).map((phase, index) => {
          const Icon = ICON_MAP[phase.icon] || Box;
          
return (
        <div 
          key={phase.id} 
          className={cn("p-4 rounded-2xl border", getStatusColor(phase.status || 'NOT_STARTED'))}
        >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", phase.color)}>
                  <Icon size={20} className="text-white" />
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border",
                  getStatusColor(phase.status)
                )}>
                  {getStatusLabel(phase.status)}
                </span>
              </div>

              <h4 className="text-sm font-black text-white mb-1">Fase {index + 1}</h4>
              <h3 className="text-base font-bold text-white line-clamp-1 mb-3">{phase.name}</h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Progresso</span>
                  <span className="text-white font-bold">{phase.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", phase.color.replace('bg-', 'bg-opacity-100 bg-'))}
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{phase.responsible || 'Sem responsável'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {phases.length > 6 && (
        <div className="text-center">
          <p className="text-slate-500 text-sm">+ {phases.length - 6} fases restantes. Veja no Cronograma.</p>
        </div>
      )}
    </div>
  );
}