'use client';

import { useState, useEffect } from 'react';
import type { Plan, PlanInput } from '@/types/plans-catalog';
import { ALL_MODULES, MODULE_LABELS, DEFAULT_PERMISSIONS, type AccessLevel, type AppModule } from '@/types/plans';
import { X } from 'lucide-react';

interface PlanFormModalProps {
  initial?: Plan;
  existingNames: string[];
  onCancel: () => void;
  onSave: (input: PlanInput) => Promise<void>;
}

const ACCESS_OPTIONS: AccessLevel[] = ['BLOQUEADO', 'VER', 'EDITAR'];
const ACCESS_LABEL: Record<AccessLevel, string> = {
  BLOQUEADO: 'Bloqueado',
  VER: 'Ver',
  EDITAR: 'Editar',
};

export default function PlanFormModal({ initial, existingNames, onCancel, onSave }: PlanFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [monthlyValue, setMonthlyValue] = useState<number>(initial?.monthlyValue ?? 0);
  const [maxMembers, setMaxMembers] = useState<number>(initial?.maxMembers ?? 0);
  const [modules, setModules] = useState<Record<AppModule, AccessLevel>>(
    initial?.modules ?? { ...DEFAULT_PERMISSIONS }
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError(null);
  }, [name, monthlyValue, maxMembers]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Nome é obrigatório.');
    if (monthlyValue < 0) return setError('Preço deve ser ≥ 0.');
    if (maxMembers < 0) return setError('Limite de usuários deve ≥ 0.');

    const conflict = existingNames
      .filter(n => !initial || n.toLowerCase() !== initial.name.toLowerCase())
      .some(n => n.toLowerCase() === trimmed.toLowerCase());
    if (conflict) return setError('Já existe um plano com esse nome.');

    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        name: trimmed,
        monthlyValue,
        maxMembers,
        modules,
        isActive: true,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-black text-white">
            {initial ? 'Editar plano' : 'Novo plano'}
          </h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Nome</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-slate-800 rounded-lg text-white border border-white/5 focus:border-blue-500 outline-none"
              placeholder="Ex: Pro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Preço mensal (R$)</label>
              <input
                type="number"
                min={0}
                value={monthlyValue}
                onChange={e => setMonthlyValue(parseFloat(e.target.value || '0'))}
                className="w-full mt-1 px-4 py-3 bg-slate-800 rounded-lg text-white border border-white/5 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Limite de usuários</label>
              <input
                type="number"
                min={0}
                value={maxMembers}
                onChange={e => setMaxMembers(parseInt(e.target.value || '0', 10))}
                className="w-full mt-1 px-4 py-3 bg-slate-800 rounded-lg text-white border border-white/5 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Módulos liberados</p>
            <div className="rounded-lg border border-white/5 overflow-hidden">
              {ALL_MODULES.map((m, idx) => (
                <div
                  key={m}
                  className={`flex items-center justify-between px-4 py-3 ${idx % 2 ? 'bg-slate-800/40' : ''}`}
                >
                  <span className="text-sm font-bold text-white">{MODULE_LABELS[m]}</span>
                  <div className="flex gap-1">
                    {ACCESS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setModules(prev => ({ ...prev, [m]: opt }))}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded ${
                          modules[m] === opt
                            ? opt === 'BLOQUEADO'
                              ? 'bg-slate-600 text-white'
                              : opt === 'VER'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-blue-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {ACCESS_LABEL[opt]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-white/5 bg-slate-950/50">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
