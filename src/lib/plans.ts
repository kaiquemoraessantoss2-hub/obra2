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
