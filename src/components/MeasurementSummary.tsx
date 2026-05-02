'use client';

import React, { useMemo } from 'react';
import { cn } from '../lib/utils';
import { ConstructionPhase } from '@/types';
import { CheckCircle, Clock, AlertTriangle, FileText, Download } from 'lucide-react';

interface MeasurementSummaryProps {
  phases: ConstructionPhase[];
  projectName?: string;
}

interface MeasurementItem {
  phaseId: string;
  phaseName: string;
  phaseColor: string;
  subStepId: string;
  subStepName: string;
  estimatedTotal: number;
  unit: string;
  executedTotal: number;
  percentage: number;
  floorsCompleted: number;
  floorsTotal: number;
}

export default function MeasurementSummary({ phases, projectName }: MeasurementSummaryProps) {
  const measurements = useMemo(() => {
    const items: MeasurementItem[] = [];

    phases.forEach(phase => {
      phase.subSteps.forEach(subStep => {
        if (subStep.hasFloorBreakdown && subStep.floorExecutions) {
          const executedTotal = subStep.floorExecutions.reduce((sum, fe) => sum + (fe.measuredQuantity || 0), 0);
          const floorsCompleted = subStep.floorExecutions.filter(fe => fe.status === 'COMPLETED').length;
          const floorsTotal = subStep.floorExecutions.length;
          const percentage = subStep.estimatedQuantity 
            ? Math.round((executedTotal / subStep.estimatedQuantity) * 100) 
            : floorsTotal > 0 
              ? Math.round((floorsCompleted / floorsTotal) * 100) 
              : 0;

          items.push({
            phaseId: phase.id,
            phaseName: phase.name,
            phaseColor: phase.color,
            subStepId: subStep.id,
            subStepName: subStep.name,
            estimatedTotal: subStep.estimatedQuantity || 0,
            unit: subStep.unit || 'pavimentos',
            executedTotal,
            percentage,
            floorsCompleted,
            floorsTotal,
          });
        }
      });
    });

    return items.sort((a, b) => b.percentage - a.percentage);
  }, [phases]);

  const totalExecuted = measurements.reduce((sum, m) => sum + m.executedTotal, 0);
  const totalEstimated = measurements.reduce((sum, m) => sum + m.estimatedTotal, 0);
  const overallPercentage = totalEstimated > 0 ? Math.round((totalExecuted / totalEstimated) * 100) : 0;

  return (
    <div className="glass-card p-8 rounded-[40px] animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-black text-white">Resumo de Medição</h3>
          <p className="text-slate-500 text-sm">{projectName || 'Projeto'} — Evolução de medição por sub-etapa</p>
        </div>
        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold flex items-center gap-2 hover:bg-white/10">
          <Download size={16} /> Exportar Relatório
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="text-blue-500" size={20} />
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Total Executado</span>
          </div>
          <p className="text-3xl font-black text-white">{totalExecuted.toFixed(1)}</p>
          <p className="text-xs text-slate-500 mt-1">unidades medidas</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-slate-400" size={20} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Previsto</span>
          </div>
          <p className="text-3xl font-black text-white">{totalEstimated}</p>
          <p className="text-xs text-slate-500 mt-1">unidades planejadas</p>
        </div>
        
        <div className={cn(
          "border rounded-2xl p-6",
          overallPercentage >= 80 ? "bg-emerald-500/10 border-emerald-500/20" :
          overallPercentage >= 50 ? "bg-blue-500/10 border-blue-500/20" :
          "bg-amber-500/10 border-amber-500/20"
        )}>
          <div className="flex items-center gap-3 mb-2">
            {overallPercentage >= 80 ? (
              <CheckCircle className="text-emerald-500" size={20} />
            ) : overallPercentage >= 50 ? (
              <Clock className="text-blue-400" size={20} />
            ) : (
              <AlertTriangle className="text-amber-500" size={20} />
            )}
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              overallPercentage >= 80 ? "text-emerald-500" :
              overallPercentage >= 50 ? "text-blue-400" :
              "text-amber-500"
            )}>
              Progresso Geral
            </span>
          </div>
          <p className="text-3xl font-black text-white">{overallPercentage}%</p>
          <p className="text-xs text-slate-500 mt-1">de execução total</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">
          Detalhamento por Sub-etapa
        </div>
        
        {measurements.map(m => (
          <div key={m.subStepId} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/[0.02] transition-all">
            <div className={cn("w-1 h-12 rounded-full", m.phaseColor.replace('bg-', 'bg-'))} />
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-white">{m.subStepName}</span>
                <span className="text-[10px] text-slate-500">{m.phaseName}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-500">
                  {m.floorsCompleted}/{m.floorsTotal} pavimentos
                </span>
                {m.estimatedTotal > 0 && (
                  <span className="text-slate-500">
                    {m.executedTotal.toFixed(1)} / {m.estimatedTotal} {m.unit}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    m.percentage >= 100 ? "bg-emerald-500" :
                    m.percentage >= 50 ? "bg-blue-500" :
                    "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(m.percentage, 100)}%` }}
                />
              </div>
              <span className={cn(
                "text-sm font-black min-w-[50px]",
                m.percentage >= 100 ? "text-emerald-500" :
                m.percentage >= 50 ? "text-blue-400" :
                "text-amber-500"
              )}>
                {m.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {measurements.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">Nenhuma medição registrada ainda.</p>
          <p className="text-xs mt-1">As medições aparecerão automaticamente conforme o progresso for sendo registrado.</p>
        </div>
      )}
    </div>
  );
}