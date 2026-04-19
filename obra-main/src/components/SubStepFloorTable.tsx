'use client';

import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { SubStep, FloorExecution, Status } from '../types';
import { ChevronDown, ChevronRight, Edit2, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface SubStepFloorTableProps {
  subStep: SubStep;
  onUpdateFloorExecution?: (subStepId: string, floorExecution: FloorExecution) => void;
}

const statusColors: Record<Status, string> = {
  'NOT_STARTED': 'bg-slate-500/20 text-slate-400',
  'IN_PROGRESS': 'bg-blue-500/20 text-blue-400',
  'COMPLETED': 'bg-emerald-500/20 text-emerald-400',
  'DELAYED': 'bg-amber-500/20 text-amber-400',
  'BLOCKED': 'bg-rose-500/20 text-rose-400',
};

const statusIcons: Record<Status, React.ReactNode> = {
  'NOT_STARTED': <XCircle size={14} />,
  'IN_PROGRESS': <Clock size={14} />,
  'COMPLETED': <CheckCircle size={14} />,
  'DELAYED': <AlertTriangle size={14} />,
  'BLOCKED': <AlertTriangle size={14} />,
};

export default function SubStepFloorTable({ subStep, onUpdateFloorExecution }: SubStepFloorTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ quantity: string; observations: string }>({ quantity: '', observations: '' });

  if (!subStep.hasFloorBreakdown || !subStep.floorExecutions) return null;

  const totalMeasured = subStep.floorExecutions.reduce((sum, fe) => sum + (fe.measuredQuantity || 0), 0);
  const estimatedTotal = subStep.estimatedQuantity || 0;
  const avgProgress = subStep.floorExecutions.reduce((sum, fe) => sum + fe.progress, 0) / subStep.floorExecutions.length;

  const handleSaveEdit = (floorId: string) => {
    if (onUpdateFloorExecution && subStep.floorExecutions) {
      const updatedExecutions = subStep.floorExecutions.map(fe => 
        fe.floorId === floorId 
          ? { 
              ...fe, 
              measuredQuantity: editValues.quantity ? parseFloat(editValues.quantity) : undefined,
              observations: editValues.observations || undefined 
            } 
          : fe
      );
      onUpdateFloorExecution(subStep.id, updatedExecutions[0] as any);
    }
    setEditingFloor(null);
  };

  return (
    <div className="mt-3 border border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Execução por Pavimento</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {subStep.floorExecutions.filter(f => f.status === 'COMPLETED').length}/{subStep.floorExecutions.length} pavimentos
          </span>
          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all" 
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-xs font-black text-white">{Math.round(avgProgress)}%</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Quantidade executada: <span className="text-white font-bold">{totalMeasured.toFixed(1)} {subStep.unit}</span></span>
            <span className="text-slate-500">Previsto: <span className="text-white font-bold">{estimatedTotal} {subStep.unit}</span></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="py-3 pr-4">Pavimento</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Progresso</th>
                  <th className="py-3 pr-4">Qtd Medida</th>
                  <th className="py-3 pr-4">Observações</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subStep.floorExecutions.map((fe) => (
                  <tr 
                    key={fe.floorId} 
                    className={cn(
                      "group hover:bg-white/[0.01]",
                      fe.status === 'DELAYED' && "bg-amber-500/5"
                    )}
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm font-bold text-white">{fe.floorLabel}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn("px-2 py-1 rounded text-[10px] font-black flex items-center gap-1 w-fit", statusColors[fe.status])}>
                        {statusIcons[fe.status]}
                        {fe.status === 'NOT_STARTED' ? 'Não Iniciado' : fe.status === 'IN_PROGRESS' ? 'Em Andamento' : fe.status === 'COMPLETED' ? 'Concluído' : fe.status === 'DELAYED' ? 'Atrasado' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", fe.status === 'COMPLETED' ? 'bg-emerald-500' : fe.status === 'DELAYED' ? 'bg-amber-500' : 'bg-blue-600')}
                            style={{ width: `${fe.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-400">{fe.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {editingFloor === fe.floorId ? (
                        <input
                          type="number"
                          value={editValues.quantity}
                          onChange={(e) => setEditValues({ ...editValues, quantity: e.target.value })}
                          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm"
                          placeholder={fe.measuredQuantity?.toString() || '0'}
                        />
                      ) : (
                        <span className="text-sm text-slate-400">
                          {fe.measuredQuantity ? `${fe.measuredQuantity} ${fe.unit || ''}` : '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {editingFloor === fe.floorId ? (
                        <input
                          type="text"
                          value={editValues.observations}
                          onChange={(e) => setEditValues({ ...editValues, observations: e.target.value })}
                          className="w-32 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm"
                          placeholder="Observação..."
                        />
                      ) : (
                        <span className="text-xs text-slate-500 max-w-[200px] truncate block">
                          {fe.observations || '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {editingFloor === fe.floorId ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSaveEdit(fe.floorId)}
                            className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500/30"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingFloor(null)}
                            className="p-1.5 bg-slate-500/20 text-slate-400 rounded hover:bg-slate-500/30"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingFloor(fe.floorId);
                            setEditValues({ 
                              quantity: fe.measuredQuantity?.toString() || '', 
                              observations: fe.observations || '' 
                            });
                          }}
                          className="p-1.5 bg-white/5 text-slate-400 rounded hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}