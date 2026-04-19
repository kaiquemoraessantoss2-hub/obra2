'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { ConstructionPhase, SubStep, FloorExecution, Status } from '@/types';
import { CheckCircle, Clock, XCircle, AlertTriangle, Edit2, Filter, Download } from 'lucide-react';

interface FloorProgressMatrixProps {
  phases: ConstructionPhase[];
  projectName?: string;
}

const statusColors: Record<Status, string> = {
  'NOT_STARTED': 'bg-slate-600',
  'IN_PROGRESS': 'bg-blue-500',
  'COMPLETED': 'bg-emerald-500',
  'DELAYED': 'bg-amber-500',
  'BLOCKED': 'bg-rose-500',
};

const statusLabels: Record<Status, string> = {
  'NOT_STARTED': 'Não Iniciado',
  'IN_PROGRESS': 'Em Andamento',
  'COMPLETED': 'Concluído',
  'DELAYED': 'Atrasado',
  'BLOCKED': 'Bloqueado',
};

export default function FloorProgressMatrix({ phases, projectName }: FloorProgressMatrixProps) {
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [editingCell, setEditingCell] = useState<{ phaseId: string; subStepId: string; floorId: string } | null>(null);

  const allFloors = useMemo(() => {
    const floors = new Map<string, { id: string; label: string; order: number }>();
    
    phases.forEach(phase => {
      phase.subSteps.forEach(subStep => {
        if (subStep.hasFloorBreakdown && subStep.floorExecutions) {
          subStep.floorExecutions.forEach(fe => {
            if (!floors.has(fe.floorId)) {
              const isBasement = fe.floorLabel.toLowerCase().includes('subsolo');
              const isGround = fe.floorLabel.toLowerCase() === 'térreo';
              const isLeisure = fe.floorLabel.toLowerCase().includes('lazer');
              const isTechnical = fe.floorLabel.toLowerCase().includes('técnica');
              
              let order = 0;
              if (isBasement) order = -100 - parseInt(fe.floorLabel.replace(/\D/g, '') || '0');
              else if (isGround) order = 0;
              else if (isLeisure) order = 100;
              else if (isTechnical) order = 200;
              else {
                const match = fe.floorLabel.match(/(\d+)/);
                order = match ? parseInt(match[1]) : 50;
              }
              
              floors.set(fe.floorId, { id: fe.floorId, label: fe.floorLabel, order });
            }
          });
        }
      });
    });
    
    return Array.from(floors.values()).sort((a, b) => a.order - b.order);
  }, [phases]);

  const subStepsWithBreakdown = useMemo(() => {
    return phases.flatMap(phase => 
      phase.subSteps
        .filter(s => s.hasFloorBreakdown && s.floorExecutions && s.floorExecutions.length > 0)
        .map(s => ({ ...s, phaseName: phase.name, phaseId: phase.id, phaseColor: phase.color }))
    );
  }, [phases]);

  const filteredSubSteps = selectedPhaseFilter === 'all' 
    ? subStepsWithBreakdown 
    : subStepsWithBreakdown.filter(s => s.phaseId === selectedPhaseFilter);

  const getStatusForCell = (subStepId: string, floorId: string): Status => {
    const subStep = subStepsWithBreakdown.find(s => s.id === subStepId);
    if (!subStep?.floorExecutions) return 'NOT_STARTED';
    const execution = subStep.floorExecutions.find(fe => fe.floorId === floorId);
    return execution?.status || 'NOT_STARTED';
  };

  const getProgressForCell = (subStepId: string, floorId: string): number => {
    const subStep = subStepsWithBreakdown.find(s => s.id === subStepId);
    if (!subStep?.floorExecutions) return 0;
    const execution = subStep.floorExecutions.find(fe => fe.floorId === floorId);
    return execution?.progress || 0;
  };

  return (
    <div className="glass-card p-8 rounded-[40px] animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-black text-white">Matriz de Progresso por Pavimento</h3>
          <p className="text-slate-500 text-sm">{projectName || 'Projeto'} — Visão geral de execução por andar</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select 
              value={selectedPhaseFilter}
              onChange={(e) => setSelectedPhaseFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-bold"
            >
              <option value="all">Todas as Fases</option>
              {phases.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold flex items-center gap-2 hover:bg-white/10">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'DELAYED'] as Status[]).map(status => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", statusColors[status])} />
            <span className="text-xs text-slate-500 font-bold">{statusLabels[status]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="py-3 px-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-[var(--background)] z-10">
                Pavimento
              </th>
              {filteredSubSteps.map(subStep => (
                <th key={subStep.id} className="py-3 px-2 text-center min-w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full", subStep.phaseColor.replace('bg-', 'bg-'))} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider line-clamp-1" title={subStep.name}>
                      {subStep.name.length > 12 ? subStep.name.substring(0, 12) + '...' : subStep.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFloors.map(floor => (
              <tr key={floor.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                <td className="py-3 px-4 text-sm font-bold text-white sticky left-0 bg-[var(--background)]">
                  {floor.label}
                </td>
                {filteredSubSteps.map(subStep => {
                  const status = getStatusForCell(subStep.id, floor.id);
                  const progress = getProgressForCell(subStep.id, floor.id);
                  return (
                    <td key={subStep.id} className="py-3 px-2 text-center">
                      <button
                        onClick={() => setEditingCell({ phaseId: subStep.phaseId, subStepId: subStep.id, floorId: floor.id })}
                        className={cn(
                          "w-full h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105",
                          statusColors[status],
                          status === 'IN_PROGRESS' && 'opacity-80',
                          status === 'NOT_STARTED' && 'opacity-40'
                        )}
                        title={`${statusLabels[status]} - ${progress}%`}
                      >
                        {status === 'COMPLETED' ? (
                          <CheckCircle size={16} className="text-white" />
                        ) : status === 'IN_PROGRESS' ? (
                          <span className="text-xs font-black text-white">{progress}%</span>
                        ) : status === 'DELAYED' ? (
                          <AlertTriangle size={14} className="text-white" />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSubSteps.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">Nenhuma sub-etapa com rastreamento por pavimento encontrada.</p>
        </div>
      )}

      {editingCell && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 rounded-[32px] border-white/10 animate-fade-in">
            <h3 className="text-xl font-black text-white mb-4">Editar Execução</h3>
            <p className="text-slate-500 text-sm mb-6">
              Pavimento: {allFloors.find(f => f.id === editingCell.floorId)?.label}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 bg-white/5 text-slate-400 rounded-xl font-bold text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}