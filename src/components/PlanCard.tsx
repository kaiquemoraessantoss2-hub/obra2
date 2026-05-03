'use client';

import type { Plan } from '@/types/plans-catalog';
import { ALL_MODULES, MODULE_LABELS, type AccessLevel } from '@/types/plans';
import { Edit2, Trash2 } from 'lucide-react';

const accessColor: Record<AccessLevel, string> = {
  BLOQUEADO: 'text-slate-600',
  VER: 'text-emerald-400',
  EDITAR: 'text-blue-400',
};

const accessLabel: Record<AccessLevel, string> = {
  BLOQUEADO: 'Bloq.',
  VER: 'Ver',
  EDITAR: 'Editar',
};

interface PlanCardProps {
  plan: Plan;
  usageCount?: number;
  variant?: 'manage' | 'select';
  selected?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PlanCard({
  plan,
  usageCount,
  variant = 'manage',
  selected = false,
  isCurrent = false,
  onClick,
  onEdit,
  onDelete,
}: PlanCardProps) {
  const clickable = variant === 'select';
  const borderClass = selected
    ? 'border-blue-500 ring-2 ring-blue-500/30'
    : isCurrent
    ? 'border-emerald-500/50'
    : 'border-white/10';

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`relative rounded-2xl border ${borderClass} bg-slate-900/60 p-6 transition ${
        clickable ? 'cursor-pointer hover:border-blue-400' : ''
      }`}
    >
      {isCurrent && (
        <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-emerald-500/20 text-emerald-400">
          Atual
        </span>
      )}

      <h3 className="text-2xl font-black text-white mb-1">{plan.name}</h3>
      <p className="text-3xl font-black text-blue-400 mb-1">
        R$ {plan.monthlyValue.toLocaleString('pt-BR')}
        <span className="text-sm text-slate-500 font-normal">/mês</span>
      </p>
      <p className="text-xs text-slate-500 mb-4 uppercase tracking-widest font-bold">
        {plan.maxMembers === 0 ? 'Sem usuários adicionais' : `Até ${plan.maxMembers} usuários`}
      </p>

      <div className="space-y-1 mb-4">
        {ALL_MODULES.map(m => (
          <div key={m} className="flex justify-between text-xs">
            <span className="text-slate-400">{MODULE_LABELS[m]}</span>
            <span className={`font-bold ${accessColor[plan.modules[m] ?? 'BLOQUEADO']}`}>
              {accessLabel[plan.modules[m] ?? 'BLOQUEADO']}
            </span>
          </div>
        ))}
      </div>

      {variant === 'manage' && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
            {usageCount ?? 0} {usageCount === 1 ? 'empresa' : 'empresas'} usando
          </span>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              title="Editar"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
