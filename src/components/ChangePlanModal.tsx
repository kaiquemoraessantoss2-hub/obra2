'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PlanCard from './PlanCard';
import { loadPlans } from '@/lib/plans';
import type { Plan } from '@/types/plans-catalog';
import type { Company } from '@/lib/auth';

interface ChangePlanModalProps {
  company: Company;
  onCancel: () => void;
  onConfirm: (plan: Plan) => Promise<void>;
}

export default function ChangePlanModal({ company, onCancel, onConfirm }: ChangePlanModalProps) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlans().then(setPlans);
  }, []);

  const currentPlan = plans?.find(p => p.name === company.plan);
  const selected = plans?.find(p => p.id === selectedId) ?? null;
  const canConfirm = !!selected && selected.name !== company.plan;

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-black text-white">Alterar plano de {company.name}</h2>
            <p className="text-sm text-slate-500 mt-1">
              Plano atual: <span className="text-white font-bold">{company.plan ?? '—'}</span>
              {currentPlan && (
                <> — R$ {currentPlan.monthlyValue.toLocaleString('pt-BR')}/mês</>
              )}
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {plans === null ? (
            <p className="text-slate-500">Carregando planos…</p>
          ) : plans.length === 0 ? (
            <p className="text-slate-500">Nenhum plano cadastrado. Crie planos na aba Planos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map(p => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  variant="select"
                  isCurrent={p.name === company.plan}
                  selected={p.id === selectedId}
                  onClick={() => setSelectedId(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/5 bg-slate-950/50">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Alterando…' : 'Confirmar alteração'}
          </button>
        </div>
      </div>
    </div>
  );
}
