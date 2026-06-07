'use client';

import { supabase } from './supabase';

// ─── Categories ───────────────────────────────────────────────────────────────

export const BUDGET_CATEGORIES = [
  'ESTRUTURA', 'FUNDACOES', 'ACABAMENTO', 'ELETRICA',
  'HIDRAULICA', 'SERVICOS', 'EQUIPAMENTOS', 'OUTROS',
] as const;

export type BudgetCategory = typeof BUDGET_CATEGORIES[number];

export const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  ESTRUTURA:    'Estrutura',
  FUNDACOES:    'Fundações',
  ACABAMENTO:   'Acabamento',
  ELETRICA:     'Elétrica',
  HIDRAULICA:   'Hidráulica',
  SERVICOS:     'Serviços',
  EQUIPAMENTOS: 'Equipamentos',
  OUTROS:       'Outros',
};

export type EntryType = 'INCOME' | 'EXPENSE';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BudgetItem {
  id: string;
  projectId: string;
  category: BudgetCategory;
  description: string;
  plannedAmount: number;
  plannedMonth: string;
  createdAt: string;
}

export interface FinancialEntry {
  id: string;
  projectId: string;
  budgetItemId?: string;
  description: string;
  amount: number;
  type: EntryType;
  date: string;
  createdBy: string;
  createdAt: string;
}

// ─── Computed helper return types ─────────────────────────────────────────────

export interface SCurvePoint    { month: string; planned: number; real: number; }
export interface CategoryPoint  { category: BudgetCategory; label: string; planned: number; real: number; }
export interface CashFlowPoint  { month: string; income: number; expense: number; balance: number; }

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapBudgetItem(r: Record<string, unknown>): BudgetItem {
  return {
    id:            r.id as string,
    projectId:     r.project_id as string,
    category:      r.category as BudgetCategory,
    description:   r.description as string,
    plannedAmount: Number(r.planned_amount),
    plannedMonth:  r.planned_month as string,
    createdAt:     r.created_at as string,
  };
}

function mapFinancialEntry(r: Record<string, unknown>): FinancialEntry {
  return {
    id:            r.id as string,
    projectId:     r.project_id as string,
    budgetItemId:  (r.budget_item_id as string | null) ?? undefined,
    description:   r.description as string,
    amount:        Number(r.amount),
    type:          r.type as EntryType,
    date:          r.date as string,
    createdBy:     r.created_by as string,
    createdAt:     r.created_at as string,
  };
}

// ─── CRUD: budget_items ───────────────────────────────────────────────────────

export async function loadBudgetItems(projectId: string): Promise<BudgetItem[]> {
  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .eq('project_id', projectId)
    .order('planned_month', { ascending: true });
  if (error) { console.error('loadBudgetItems', error); return []; }
  return (data || []).map(mapBudgetItem);
}

export async function saveBudgetItem(
  item: Omit<BudgetItem, 'id' | 'createdAt'>
): Promise<BudgetItem | null> {
  const { data, error } = await supabase
    .from('budget_items')
    .insert({
      project_id:     item.projectId,
      category:       item.category,
      description:    item.description,
      planned_amount: item.plannedAmount,
      planned_month:  item.plannedMonth,
    })
    .select()
    .single();
  if (error) { console.error('saveBudgetItem', error); return null; }
  return mapBudgetItem(data as Record<string, unknown>);
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from('budget_items').delete().eq('id', id);
  if (error) console.error('deleteBudgetItem', error);
}

// ─── CRUD: financial_entries ──────────────────────────────────────────────────

export async function loadFinancialEntries(projectId: string): Promise<FinancialEntry[]> {
  const { data, error } = await supabase
    .from('financial_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
  if (error) { console.error('loadFinancialEntries', error); return []; }
  return (data || []).map(mapFinancialEntry);
}

export async function saveFinancialEntry(
  entry: Omit<FinancialEntry, 'id' | 'createdAt'>
): Promise<FinancialEntry | null> {
  const { data, error } = await supabase
    .from('financial_entries')
    .insert({
      project_id:     entry.projectId,
      budget_item_id: entry.budgetItemId || null,
      description:    entry.description,
      amount:         entry.amount,
      type:           entry.type,
      date:           entry.date,
      created_by:     entry.createdBy,
    })
    .select()
    .single();
  if (error) { console.error('saveFinancialEntry', error); return null; }
  return mapFinancialEntry(data as Record<string, unknown>);
}

export async function deleteFinancialEntry(id: string): Promise<void> {
  const { error } = await supabase.from('financial_entries').delete().eq('id', id);
  if (error) console.error('deleteFinancialEntry', error);
}

// ─── Bulk loaders (multi-project) ────────────────────────────────────────────

export async function loadAllBudgetItems(projectIds: string[]): Promise<BudgetItem[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .in('project_id', projectIds)
    .order('planned_month', { ascending: true });
  if (error) { console.error('loadAllBudgetItems', error); return []; }
  return (data || []).map(mapBudgetItem);
}

export async function loadAllFinancialEntries(projectIds: string[]): Promise<FinancialEntry[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from('financial_entries')
    .select('*')
    .in('project_id', projectIds)
    .order('date', { ascending: false });
  if (error) { console.error('loadAllFinancialEntries', error); return []; }
  return (data || []).map(mapFinancialEntry);
}

// ─── Computed helpers ─────────────────────────────────────────────────────────

export function buildSCurveData(items: BudgetItem[], entries: FinancialEntry[]): SCurvePoint[] {
  const expenses = entries.filter(e => e.type === 'EXPENSE');
  const monthSet = new Set<string>();
  items.forEach(i => { if (i.plannedMonth.length >= 7) monthSet.add(i.plannedMonth.slice(0, 7)); });
  expenses.forEach(e => { if (e.date.length >= 7) monthSet.add(e.date.slice(0, 7)); });
  const months = Array.from(monthSet).sort();

  const plannedByMonth: Record<string, number> = {};
  items.forEach(i => {
    if (i.plannedMonth.length < 7) return;
    const m = i.plannedMonth.slice(0, 7);
    plannedByMonth[m] = (plannedByMonth[m] || 0) + i.plannedAmount;
  });

  const realByMonth: Record<string, number> = {};
  expenses.forEach(e => {
    if (e.date.length < 7) return;
    const m = e.date.slice(0, 7);
    realByMonth[m] = (realByMonth[m] || 0) + e.amount;
  });

  let cumPlanned = 0;
  let cumReal = 0;
  return months.map(month => {
    cumPlanned += plannedByMonth[month] || 0;
    cumReal    += realByMonth[month]    || 0;
    return {
      month,
      planned: Math.round(cumPlanned * 100) / 100,
      real:    Math.round(cumReal    * 100) / 100,
    };
  });
}

export function buildCategoryData(items: BudgetItem[], entries: FinancialEntry[]): CategoryPoint[] {
  const map: Partial<Record<BudgetCategory, { planned: number; real: number }>> = {};

  items.forEach(i => {
    if (!map[i.category]) map[i.category] = { planned: 0, real: 0 };
    map[i.category]!.planned += i.plannedAmount;
  });

  entries.filter(e => e.type === 'EXPENSE').forEach(e => {
    const linked = items.find(i => i.id === e.budgetItemId);
    const cat: BudgetCategory = linked?.category ?? 'OUTROS';
    if (!map[cat]) map[cat] = { planned: 0, real: 0 };
    map[cat]!.real += e.amount;
  });

  return (Object.keys(map) as BudgetCategory[])
    .filter(cat => BUDGET_CATEGORIES.includes(cat))
    .map(cat => ({
    category: cat,
    label:    CATEGORY_LABELS[cat] ?? cat,
    planned:  Math.round(map[cat]!.planned * 100) / 100,
    real:     Math.round(map[cat]!.real    * 100) / 100,
  }));
}

export function buildCashFlowData(entries: FinancialEntry[]): CashFlowPoint[] {
  const monthSet = new Set<string>();
  entries.forEach(e => { if (e.date.length >= 7) monthSet.add(e.date.slice(0, 7)); });
  const months = Array.from(monthSet).sort();

  const byMonth: Record<string, { income: number; expense: number }> = {};
  entries.forEach(e => {
    if (e.date.length < 7) return;
    const m = e.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
    if (e.type === 'INCOME') byMonth[m].income  += e.amount;
    else                     byMonth[m].expense += e.amount;
  });

  let balance = 0;
  return months.map(month => {
    balance += byMonth[month].income - byMonth[month].expense;
    return {
      month,
      income:  Math.round(byMonth[month].income  * 100) / 100,
      expense: Math.round(byMonth[month].expense * 100) / 100,
      balance: Math.round(balance                * 100) / 100,
    };
  });
}
