# Catálogo de Planos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o `prompt()` nativo de alteração de plano por um modal in-app, criar uma aba "Planos" (SUPERADMIN) com CRUD do catálogo de planos persistido no Supabase, e corrigir o bug em que o plano resetava após reload.

**Architecture:** Nova tabela `plans` no Supabase (fonte da verdade) consumida por (1) uma aba SUPERADMIN para gerenciar o catálogo e (2) um modal "Alterar plano" no AdminPanel. Mutações de `companies` passam a usar `await` com tratamento de erro e recarregamento do banco para eliminar o estado fantasma que causava o reset.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Supabase JS + Tailwind v4 + lucide-react. Sem framework de testes — validação por `npm run build` (type-check) + verificação manual no `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-05-03-catalogo-de-planos-design.md`

---

## File Structure

**Created:**
- `supabase/migrations/004_plans_catalog.sql` — tabela `plans`, RLS, seed dos 3 planos.
- `src/types/plans-catalog.ts` — interface `Plan` (formato unificado app-level).
- `src/lib/plans.ts` — CRUD do catálogo no Supabase.
- `src/components/PlansCatalog.tsx` — página da aba "Planos".
- `src/components/PlanFormModal.tsx` — modal criar/editar plano.
- `src/components/PlanCard.tsx` — card visual reutilizável (catálogo + modal de alterar).
- `src/components/ChangePlanModal.tsx` — modal "Alterar plano" da empresa.

**Modified:**
- `src/lib/auth.ts` — `saveCompany` retorna `{ ok, error }` em vez de `void`; documenta limitação de `saveCompanies`.
- `src/app/page.tsx` — adiciona NavItem da aba "Planos", trata `activeTab === 'plans_catalog'`, substitui handler `onChangePlan` (linhas ~1170-1179) para abrir `<ChangePlanModal>`, ajusta chamada de `saveCompany` para usar a nova assinatura.

---

## Task 1: Migration do catálogo de planos

**Files:**
- Create: `supabase/migrations/004_plans_catalog.sql`

- [ ] **Step 1: Criar arquivo de migration**

Criar `supabase/migrations/004_plans_catalog.sql` com este conteúdo exato:

```sql
-- 004_plans_catalog.sql
-- Catálogo de planos do sistema (SUPERADMIN gerencia)

CREATE TABLE IF NOT EXISTS plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text UNIQUE NOT NULL,
  monthly_value numeric NOT NULL DEFAULT 0,
  max_members   integer NOT NULL DEFAULT 0,
  modules       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION plans_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_updated_at ON plans;
CREATE TRIGGER plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION plans_set_updated_at();

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_authenticated" ON plans;
CREATE POLICY "plans_select_authenticated" ON plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "plans_insert_superadmin" ON plans;
CREATE POLICY "plans_insert_superadmin" ON plans
  FOR INSERT WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "plans_update_superadmin" ON plans;
CREATE POLICY "plans_update_superadmin" ON plans
  FOR UPDATE USING (is_superadmin());

DROP POLICY IF EXISTS "plans_delete_superadmin" ON plans;
CREATE POLICY "plans_delete_superadmin" ON plans
  FOR DELETE USING (is_superadmin());

-- Seed dos 3 planos atuais (idempotente)
INSERT INTO plans (name, monthly_value, max_members, modules) VALUES
  ('Básico', 199, 0, '{
    "DASHBOARD":"VER",
    "CRONOGRAMA":"VER",
    "PAVIMENTOS":"BLOQUEADO",
    "MEDICAO":"BLOQUEADO",
    "DOCUMENTOS":"BLOQUEADO",
    "PENDENCIAS":"VER",
    "MEDICAO_OBRA":"VER"
  }'::jsonb),
  ('Pro', 499, 3, '{
    "DASHBOARD":"VER",
    "CRONOGRAMA":"VER",
    "PAVIMENTOS":"VER",
    "MEDICAO":"VER",
    "DOCUMENTOS":"VER",
    "PENDENCIAS":"VER",
    "MEDICAO_OBRA":"VER"
  }'::jsonb),
  ('Empresa', 1200, 5, '{
    "DASHBOARD":"EDITAR",
    "CRONOGRAMA":"EDITAR",
    "PAVIMENTOS":"EDITAR",
    "MEDICAO":"EDITAR",
    "DOCUMENTOS":"EDITAR",
    "PENDENCIAS":"EDITAR",
    "MEDICAO_OBRA":"EDITAR"
  }'::jsonb)
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 2: Aplicar a migration**

Executar:
```bash
supabase db push
```

Esperado: log "Applied migration 004_plans_catalog.sql".

- [ ] **Step 3: Verificar no banco**

No SQL editor do Supabase, rodar:
```sql
SELECT name, monthly_value, max_members FROM plans ORDER BY monthly_value;
```

Esperado: 3 linhas (Básico/199, Pro/499, Empresa/1200).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_plans_catalog.sql
git commit -m "feat(db): add plans catalog table with RLS and seed"
```

---

## Task 2: Tipo `Plan` no front-end

**Files:**
- Create: `src/types/plans-catalog.ts`

- [ ] **Step 1: Criar arquivo de tipo**

Criar `src/types/plans-catalog.ts` com este conteúdo:

```typescript
import type { AppModule, AccessLevel } from './plans';

export interface Plan {
  id: string;
  name: string;
  monthlyValue: number;
  maxMembers: number;
  modules: Record<AppModule, AccessLevel>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PlanInput = Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
```

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa (a tipagem é apenas declarativa, ainda não usada).

- [ ] **Step 3: Commit**

```bash
git add src/types/plans-catalog.ts
git commit -m "feat(types): add Plan type for plans catalog"
```

---

## Task 3: Camada de dados `src/lib/plans.ts`

**Files:**
- Create: `src/lib/plans.ts`

- [ ] **Step 1: Criar `src/lib/plans.ts`**

Conteúdo:

```typescript
'use client';

import { supabase } from './supabase';
import type { Plan, PlanInput } from '@/types/plans-catalog';
import type { AppModule, AccessLevel } from '@/types/plans';

function rowToPlan(r: any): Plan {
  return {
    id: r.id,
    name: r.name,
    monthlyValue: typeof r.monthly_value === 'string' ? parseFloat(r.monthly_value) : r.monthly_value,
    maxMembers: r.max_members,
    modules: (r.modules ?? {}) as Record<AppModule, AccessLevel>,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function loadPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('monthly_value', { ascending: true });
  if (error) {
    console.error('loadPlans error:', error);
    return [];
  }
  return (data ?? []).map(rowToPlan);
}

export async function savePlan(plan: PlanInput): Promise<{ ok: boolean; error?: string; plan?: Plan }> {
  const record: any = {
    name: plan.name.trim(),
    monthly_value: plan.monthlyValue,
    max_members: plan.maxMembers,
    modules: plan.modules,
    is_active: plan.isActive ?? true,
  };

  if (plan.id) {
    const { data, error } = await supabase
      .from('plans')
      .update(record)
      .eq('id', plan.id)
      .select()
      .single();
    if (error) {
      console.error('savePlan update error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, plan: rowToPlan(data) };
  } else {
    const { data, error } = await supabase
      .from('plans')
      .insert(record)
      .select()
      .single();
    if (error) {
      console.error('savePlan insert error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, plan: rowToPlan(data) };
  }
}

export async function deletePlan(id: string): Promise<{ ok: boolean; error?: string; reason?: 'in_use'; usageCount?: number }> {
  const planRes = await supabase.from('plans').select('name').eq('id', id).single();
  if (planRes.error) return { ok: false, error: planRes.error.message };

  const planName = planRes.data.name as string;
  const { count, error: countErr } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('plan', planName);

  if (countErr) return { ok: false, error: countErr.message };
  if ((count ?? 0) > 0) return { ok: false, reason: 'in_use', usageCount: count ?? 0 };

  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function countCompaniesByPlanName(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('companies').select('plan');
  if (error) {
    console.error('countCompaniesByPlanName error:', error);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const name = (row as any).plan as string | null;
    if (!name) continue;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}
```

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa.

- [ ] **Step 3: Commit**

```bash
git add src/lib/plans.ts
git commit -m "feat(plans): add load/save/delete plans data layer"
```

---

## Task 4: Ajustar `saveCompany` para retornar `{ ok, error }`

**Files:**
- Modify: `src/lib/auth.ts:309-338`

- [ ] **Step 1: Substituir as funções `saveCompany` e `saveCompanies`**

Em `src/lib/auth.ts`, localizar o bloco entre as linhas ~309 e ~338 (funções `saveCompany` e `saveCompanies`) e substituir por:

```typescript
export async function saveCompany(company: Company): Promise<{ ok: boolean; error?: string }> {
  const record: any = {
    name: company.name,
    email: company.email,
    phone: company.phone,
    address: company.address,
    plan: company.plan,
    monthly_value: company.monthlyValue,
    plan_start_date: company.planStartDate,
    plan_end_date: company.planEndDate,
    billing_status: company.billingStatus,
    is_paused: company.isPaused,
    active_users: company.activeUsers,
  };
  Object.keys(record).forEach(k => record[k] === undefined && delete record[k]);

  if (company.id) {
    const { error } = await supabase
      .from('companies')
      .update(record)
      .eq('id', company.id);
    if (error) {
      console.error('saveCompany update error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } else {
    const { error } = await supabase.from('companies').insert(record);
    if (error) {
      console.error('saveCompany insert error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }
}

export async function saveCompanies(companies: Company[]): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const company of companies) {
    const result = await saveCompany(company);
    if (!result.ok && result.error) errors.push(`${company.name}: ${result.error}`);
  }
  return { ok: errors.length === 0, errors };
}
```

Mudanças em relação ao original:
- Quando `company.id` existe, usa `.update().eq('id', ...)` em vez de `.upsert(...)`. Motivo: o upsert exigia INSERT permission via RLS, e a falha silenciosa do upsert era a causa-raiz mais provável do bug de reset.
- Retorna `{ ok, error }` em vez de `void`.

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: **vai falhar** em `src/app/page.tsx` porque `saveCompanies` agora retorna objeto e há chamadas `saveCompanies(updated)` sem uso do retorno (isso é OK, mas a próxima task ajusta a chamada). Se houver erro de tipo, é da Task 5/8.

Se a build passar mesmo assim (porque o retorno é ignorado), seguir.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "fix(auth): saveCompany returns ok/error and uses update instead of upsert"
```

---

## Task 5: Componente `PlanCard` reutilizável

**Files:**
- Create: `src/components/PlanCard.tsx`

- [ ] **Step 1: Criar `src/components/PlanCard.tsx`**

Conteúdo:

```typescript
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
```

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanCard.tsx
git commit -m "feat(ui): add reusable PlanCard component"
```

---

## Task 6: Modal `PlanFormModal` (criar/editar plano)

**Files:**
- Create: `src/components/PlanFormModal.tsx`

- [ ] **Step 1: Criar `src/components/PlanFormModal.tsx`**

Conteúdo:

```typescript
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
```

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlanFormModal.tsx
git commit -m "feat(ui): add PlanFormModal for creating/editing plans"
```

---

## Task 7: Página `PlansCatalog` (aba Planos)

**Files:**
- Create: `src/components/PlansCatalog.tsx`

- [ ] **Step 1: Criar `src/components/PlansCatalog.tsx`**

Conteúdo:

```typescript
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
```

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlansCatalog.tsx
git commit -m "feat(ui): add PlansCatalog page (SUPERADMIN tab)"
```

---

## Task 8: Modal `ChangePlanModal` (substitui `prompt()`)

**Files:**
- Create: `src/components/ChangePlanModal.tsx`

- [ ] **Step 1: Criar `src/components/ChangePlanModal.tsx`**

Conteúdo:

```typescript
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
```

- [ ] **Step 2: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChangePlanModal.tsx
git commit -m "feat(ui): add ChangePlanModal to replace native prompt()"
```

---

## Task 9: Integrar `PlansCatalog` e `ChangePlanModal` no `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Adicionar imports**

No topo de `src/app/page.tsx`, no bloco de imports de componentes (linhas ~60-70), adicionar:

```typescript
import PlansCatalog from '@/components/PlansCatalog';
import ChangePlanModal from '@/components/ChangePlanModal';
```

E nos imports do lucide-react, garantir que `Package` (ou outro ícone preferido) está disponível. Procurar a linha que importa de `'lucide-react'` (próxima ao topo) e adicionar `Package` à lista, ex: `import { ..., Package, ... } from 'lucide-react';`. Se já tiver, pular.

- [ ] **Step 2: Adicionar estado para o modal de alteração de plano**

No bloco de `useState` em `GlobalApplication`, depois de `const [companies, setCompanies] = useState<Company[]>([]);` (linha ~93), adicionar:

```typescript
const [changePlanCompany, setChangePlanCompany] = useState<Company | null>(null);
```

- [ ] **Step 3: Adicionar `NavItem` da aba Planos na sidebar**

Localizar o bloco SUPERADMIN em `page.tsx` (próximo à linha 1117) que contém:

```typescript
<NavItem icon={Shield} label="Painel Master" active={activeTab === 'admin_dashboard'} onClick={() => setActiveTab('admin_dashboard')} />
<NavItem icon={CreditCard} label="Faturamento" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
<NavItem icon={Settings} label="Configurações" active={activeTab === 'admin_settings'} onClick={() => setActiveTab('admin_settings')} />
```

Adicionar **logo após o NavItem de "Faturamento"**:

```typescript
<NavItem icon={Package} label="Planos" active={activeTab === 'plans_catalog'} onClick={() => setActiveTab('plans_catalog')} />
```

- [ ] **Step 4: Renderizar `PlansCatalog` quando `activeTab === 'plans_catalog'`**

Localizar a renderização condicional do AdminPanel (linha ~1153):

```typescript
{currentUser.role === 'SUPERADMIN' && activeTab === 'admin_dashboard' && (
   <AdminPanel ...
```

Logo após o bloco `<AdminPanel ... />` (depois do `)}` que fecha a renderização condicional do AdminPanel), adicionar:

```typescript
{currentUser.role === 'SUPERADMIN' && activeTab === 'plans_catalog' && (
  <PlansCatalog
    onToast={(message, type) => setToast({ message, type })}
  />
)}
```

- [ ] **Step 5: Substituir o `onChangePlan` que usa `prompt()`**

Localizar em `src/app/page.tsx` o bloco entre as linhas ~1170-1179:

```typescript
onChangePlan={(companyId: string, currentPlan: string) => {
   const newPlan = prompt(`Plano atual: ${currentPlan}\nDigite o novo plano (Básico, Pro, Empresa):`);
   if (newPlan && ['Básico', 'Pro', 'Empresa'].includes(newPlan)) {
     const prices: Record<string, number> = { 'Básico': 199, 'Pro': 499, 'Empresa': 1200 };
     const updatedCompanies = companies.map(c => c.id === companyId ? { ...c, plan: newPlan as 'Básico' | 'Pro' | 'Empresa', monthlyValue: prices[newPlan] } : c);
     setCompanies(updatedCompanies);
     saveCompanies(updatedCompanies);
     setToast({ message: `Plano alterado para ${newPlan}!`, type: 'success' });
   }
 }}
```

Substituir por:

```typescript
onChangePlan={(companyId: string) => {
  const company = companies.find(c => c.id === companyId);
  if (company) setChangePlanCompany(company);
}}
```

- [ ] **Step 6: Renderizar o `<ChangePlanModal>` no final do JSX**

Localizar o final do JSX do componente `GlobalApplication` (próximo do `</div>` que fecha o layout principal, antes do `);` final). Adicionar antes do `);` final:

```typescript
{changePlanCompany && (
  <ChangePlanModal
    company={changePlanCompany}
    onCancel={() => setChangePlanCompany(null)}
    onConfirm={async (plan) => {
      const updated: Company = {
        ...changePlanCompany,
        plan: plan.name,
        monthlyValue: plan.monthlyValue,
      };
      const result = await saveCompany(updated);
      if (!result.ok) {
        setToast({ message: `Erro ao alterar plano: ${result.error}`, type: 'error' });
        return;
      }
      const fresh = await loadCompanies();
      setCompanies(fresh);
      setToast({ message: `Plano alterado para ${plan.name}!`, type: 'success' });
      setChangePlanCompany(null);
    }}
  />
)}
```

- [ ] **Step 7: Type-check**

Rodar:
```bash
npm run build
```

Esperado: build passa.

Se reclamar que `onChangePlan` em `AdminPanel` espera 2 argumentos, ignorar — `AdminPanel` recebe `onChangePlan: any` (linha 1772) e o handler pode ter assinatura mais simples. Se houver erro de tipo concreto, ajustar a assinatura do prop em `AdminPanel`.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate PlansCatalog tab and ChangePlanModal"
```

---

## Task 10: Verificação manual no dev server

**Files:** (nenhum — só verificação)

- [ ] **Step 1: Iniciar dev server**

```bash
npm run dev
```

Esperado: servidor sobe em http://localhost:3000.

- [ ] **Step 2: Login como SUPERADMIN**

Verificar que aparece o item **"Planos"** na sidebar com ícone `Package`.

- [ ] **Step 3: Abrir aba Planos**

Esperado: 3 cards (Básico R$199, Pro R$499, Empresa R$1200), cada um mostrando módulos liberados e contagem de empresas usando.

- [ ] **Step 4: Criar plano novo**

Clicar em **"+ Novo Plano"**. Preencher:
- Nome: "Teste"
- Preço: 999
- Limite: 10
- Marcar Medição como `EDITAR`

Clicar em **Salvar**. Esperado: toast verde, modal fecha, novo card aparece.

- [ ] **Step 5: Editar plano**

Clicar no lápis do "Teste". Mudar preço para 1000. Salvar. Esperado: card atualiza para R$ 1.000.

- [ ] **Step 6: Excluir plano não usado**

Clicar na lixeira do "Teste", confirmar. Esperado: toast verde, card some.

- [ ] **Step 7: Tentar excluir plano em uso**

Clicar na lixeira de um plano que tem empresa usando (badge mostra "X empresas usando"). Confirmar.
Esperado: toast vermelho "X empresa(s) usam esse plano. Migre-as antes de excluir."

- [ ] **Step 8: Voltar ao Painel Master e abrir modal de alterar plano**

Clicar no ícone azul (refresh) na linha de uma empresa. Esperado: modal "Alterar plano de {empresa}" abre com 3 cards visuais. Card do plano atual tem badge "Atual" e borda verde.

- [ ] **Step 9: Selecionar outro plano e confirmar**

Clicar em outro plano (Pro ou Empresa) e clicar em **Confirmar alteração**. Esperado: toast verde, modal fecha, linha da empresa mostra novo plano e novo valor.

- [ ] **Step 10: Recarregar a página (F5)**

Esperado: o plano alterado **persiste**. Se voltar ao anterior, o bug ainda está vivo — abrir DevTools/console e o painel Logs do Supabase para diagnosticar (ver "Suspeitas" no spec, seção "Bug").

- [ ] **Step 11: Confirmar tudo funcionou**

Se todos os passos 1-10 passaram, fechar o dev server.

- [ ] **Step 12: Commit final (se houver ajustes)**

Se algum bug apareceu e foi corrigido durante o teste manual, fazer commit:
```bash
git add -A
git commit -m "fix: ajustes pós-teste manual"
```

Senão, pular este step.

---

## Critérios de aceite

- [x] Tabela `plans` existe no Supabase com 3 planos seed.
- [x] Aba "Planos" aparece na sidebar **só** para SUPERADMIN.
- [x] CRUD do catálogo funciona: criar, editar, excluir.
- [x] Excluir plano em uso é bloqueado com mensagem clara.
- [x] Modal "Alterar plano" substitui o `prompt()` e mostra cards visuais de todos os planos do catálogo.
- [x] Após alterar plano e dar F5, o novo plano permanece (bug de persistência resolvido).
- [x] `npm run build` passa.
