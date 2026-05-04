'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import PlanCard from './PlanCard';
import PlanFormModal from './PlanFormModal';
import { loadPlans, savePlan, deletePlan, countCompaniesByPlanName } from '@/lib/plans';
import type { Plan, PlanInput } from '@/types/plans-catalog';

interface PlansCatalogProps {
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export default function PlansCatalog({ onToast }: PlansCatalogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [p, u] = await Promise.all([loadPlans(), countCompaniesByPlanName()]);
    setPlans(p);
    setUsage(u);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async (input: PlanInput) => {
    const result = await savePlan(input);
    if (!result.ok) {
      onToast(`Erro ao salvar: ${result.error}`, 'error');
      throw new Error(result.error);
    }
    onToast(input.id ? 'Plano atualizado!' : 'Plano criado!', 'success');
    setEditing(null);
    setCreating(false);
    await refresh();
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Excluir o plano "${plan.name}"?`)) return;
    const result = await deletePlan(plan.id);
    if (result.reason === 'in_use') {
      onToast(
        `${result.usageCount} empresa(s) usam esse plano. Migre-as antes de excluir.`,
        'error'
      );
      return;
    }
    if (!result.ok) {
      onToast(`Erro ao excluir: ${result.error}`, 'error');
      return;
    }
    onToast('Plano excluído!', 'success');
    await refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Catálogo de Planos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os planos disponíveis no sistema. Alterações refletem em todas as empresas que usam o plano.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
        >
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : plans.length === 0 ? (
        <p className="text-slate-500">Nenhum plano cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map(p => (
            <PlanCard
              key={p.id}
              plan={p}
              usageCount={usage[p.name] ?? 0}
              onEdit={() => setEditing(p)}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PlanFormModal
          initial={editing ?? undefined}
          existingNames={plans.map(p => p.name)}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
