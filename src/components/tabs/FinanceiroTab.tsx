'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, X, Trash2,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import {
  BudgetItem, FinancialEntry, BudgetCategory, EntryType,
  BUDGET_CATEGORIES, CATEGORY_LABELS,
  SCurvePoint, CategoryPoint, CashFlowPoint,
  loadBudgetItems, saveBudgetItem, deleteBudgetItem,
  loadFinancialEntries, saveFinancialEntry, deleteFinancialEntry,
  buildSCurveData, buildCategoryData, buildCashFlowData,
} from '@/lib/financeiro';

// ─── Local types ──────────────────────────────────────────────────────────────

type SubTab     = 'orcamento' | 'lancamentos' | 'graficos';
type EntryFilter = 'ALL' | 'INCOME' | 'EXPENSE';

interface ItemForm {
  category:      BudgetCategory;
  description:   string;
  plannedAmount: string;
  plannedMonth:  string;
}

interface EntryFormState {
  type:         EntryType;
  date:         string;
  amount:       string;
  description:  string;
  budgetItemId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtMonth(yyyyMM: string) {
  const [year, month] = yyyyMM.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[parseInt(month) - 1]}/${year.slice(2)}`;
}

function itemRealSpent(item: BudgetItem, entries: FinancialEntry[]) {
  return entries
    .filter(e => e.type === 'EXPENSE' && e.budgetItemId === item.id)
    .reduce((s, e) => s + e.amount, 0);
}

function itemStatus(planned: number, real: number): { label: string; cls: string } {
  if (real > planned)           return { label: 'ESTOURADO', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  if (real > planned * 0.9)     return { label: 'ALERTA',    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  return                               { label: 'OK',        cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, colorCls }: { label: string; value: string; colorCls: string }) {
  return (
    <div className={cn('rounded-xl border p-4', colorCls)}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

// ─── Orçamento sub-tab ────────────────────────────────────────────────────────

function OrcamentoSubTab({
  items, entries, showForm, form, onFormChange, onSave, onDelete, onToggleForm,
}: {
  items: BudgetItem[];
  entries: FinancialEntry[];
  showForm: boolean;
  form: ItemForm;
  onFormChange: (f: ItemForm) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onToggleForm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onToggleForm}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancelar' : 'Novo Item'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white">Novo item de orçamento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
              <select
                value={form.category}
                onChange={e => onFormChange({ ...form, category: e.target.value as BudgetCategory })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                {BUDGET_CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Mês planejado</label>
              <input
                type="month"
                value={form.plannedMonth}
                onChange={e => onFormChange({ ...form, plannedMonth: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={e => onFormChange({ ...form, description: e.target.value })}
                placeholder="Ex: Fundação em radier"
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Valor planejado (R$)</label>
              <input
                type="number"
                value={form.plannedAmount}
                onChange={e => onFormChange({ ...form, plannedAmount: e.target.value })}
                placeholder="0,00"
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhum item de orçamento. Clique em &quot;Novo Item&quot; para começar.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Mês</th>
                <th className="text-right px-4 py-3 font-medium">Orçado</th>
                <th className="text-right px-4 py-3 font-medium">Realizado</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Saldo</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map(item => {
                const real   = itemRealSpent(item, entries);
                const saldo  = item.plannedAmount - real;
                const status = itemStatus(item.plannedAmount, real);
                return (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs border bg-slate-500/10 text-slate-300 border-slate-500/20">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{item.description}</td>
                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                      {fmtMonth(item.plannedMonth.slice(0, 7))}
                    </td>
                    <td className="px-4 py-3 text-right text-white">{fmtBRL(item.plannedAmount)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{fmtBRL(real)}</td>
                    <td className={cn('px-4 py-3 text-right hidden md:table-cell', saldo >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {fmtBRL(saldo)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-xs border', status.cls)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Lançamentos sub-tab ──────────────────────────────────────────────────────

function LancamentosSubTab({
  entries, items, filter, onFilterChange,
  showForm, form, onFormChange, onSave, onDelete, onToggleForm,
}: {
  entries: FinancialEntry[];
  items: BudgetItem[];
  filter: EntryFilter;
  onFilterChange: (f: EntryFilter) => void;
  showForm: boolean;
  form: EntryFormState;
  onFormChange: (f: EntryFormState) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onToggleForm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['ALL', 'INCOME', 'EXPENSE'] as EntryFilter[]).map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filter === f ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {f === 'ALL' ? 'Todos' : f === 'INCOME' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
        <button
          onClick={onToggleForm}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancelar' : 'Novo Lançamento'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm font-medium text-white">Novo lançamento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select
                value={form.type}
                onChange={e => onFormChange({ ...form, type: e.target.value as EntryType })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => onFormChange({ ...form, date: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Valor (R$)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => onFormChange({ ...form, amount: e.target.value })}
                placeholder="0,00"
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Item de orçamento (opcional)</label>
              <select
                value={form.budgetItemId}
                onChange={e => onFormChange({ ...form, budgetItemId: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">— sem vínculo —</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.description}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={e => onFormChange({ ...form, description: e.target.value })}
                placeholder="Ex: Pagamento NF 1234"
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhum lançamento encontrado.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Item vinculado</th>
                <th className="text-center px-4 py-3 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map(entry => {
                const linked = items.find(i => i.id === entry.budgetItemId);
                return (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-white">{entry.description}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {linked ? linked.description : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs border',
                        entry.type === 'INCOME'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      )}>
                        {entry.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right font-medium',
                      entry.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {fmtBRL(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Gráficos sub-tab ─────────────────────────────────────────────────────────

function GraficosSubTab({
  sCurveData, categoryData, cashFlowData,
}: {
  sCurveData:   SCurvePoint[];
  categoryData: CategoryPoint[];
  cashFlowData: CashFlowPoint[];
}) {
  const empty = sCurveData.length === 0 && categoryData.length === 0 && cashFlowData.length === 0;

  if (empty) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Adicione itens de orçamento e lançamentos para ver os gráficos.
      </div>
    );
  }

  const sCurveWithLabel   = sCurveData.map(p => ({ ...p, month: fmtMonth(p.month) }));
  const cashFlowWithLabel = cashFlowData.map(p => ({ ...p, month: fmtMonth(p.month) }));

  return (
    <div className="space-y-8">
      {sCurveData.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white mb-4">Curva S — Planejado × Realizado (acumulado)</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sCurveWithLabel}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#cbd5e1' }}
                formatter={(value) => fmtBRL(Number(value))}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Line type="monotone" dataKey="planned" name="Planejado" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="real"    name="Realizado" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {categoryData.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white mb-4">Orçado × Realizado por Categoria</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#cbd5e1' }}
                formatter={(value) => fmtBRL(Number(value))}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="planned" name="Orçado"    fill="#60a5fa" radius={[4,4,0,0]} />
              <Bar dataKey="real"    name="Realizado" fill="#f97316" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {cashFlowData.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white mb-4">Fluxo de Caixa Mensal</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={cashFlowWithLabel}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#cbd5e1' }}
                formatter={(value) => fmtBRL(Number(value))}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar  dataKey="income"  name="Receitas"       fill="#34d399" radius={[4,4,0,0]} />
              <Bar  dataKey="expense" name="Despesas"        fill="#f87171" radius={[4,4,0,0]} />
              <Line dataKey="balance" name="Saldo acumulado" stroke="#facc15" strokeWidth={2} dot={false} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function FinanceiroTab() {
  const { activeProjectId, currentUser } = useAppContext();

  const [subTab,   setSubTab]   = useState<SubTab>('orcamento');
  const [items,    setItems]    = useState<BudgetItem[]>([]);
  const [entries,  setEntries]  = useState<FinancialEntry[]>([]);
  const [loading,  setLoading]  = useState(false);

  const [showItemForm,  setShowItemForm]  = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryFilter,   setEntryFilter]   = useState<EntryFilter>('ALL');

  const [itemForm, setItemForm] = useState<ItemForm>({
    category:      'ESTRUTURA',
    description:   '',
    plannedAmount: '',
    plannedMonth:  '',
  });

  const [entryForm, setEntryForm] = useState<EntryFormState>({
    type:         'EXPENSE',
    date:         '',
    amount:       '',
    description:  '',
    budgetItemId: '',
  });

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);
    Promise.all([
      loadBudgetItems(activeProjectId),
      loadFinancialEntries(activeProjectId),
    ]).then(([bi, fe]) => {
      setItems(bi);
      setEntries(fe);
      setLoading(false);
    });
  }, [activeProjectId]);

  const totalPlanned = items.reduce((s, i) => s + i.plannedAmount, 0);
  const totalSpent   = entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0);
  const balance      = totalPlanned - totalSpent;
  const pctExecuted  = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

  async function handleSaveItem() {
    if (!activeProjectId || !itemForm.description.trim() || !itemForm.plannedAmount || !itemForm.plannedMonth) return;
    const saved = await saveBudgetItem({
      projectId:     activeProjectId,
      category:      itemForm.category,
      description:   itemForm.description.trim(),
      plannedAmount: Number(itemForm.plannedAmount),
      plannedMonth:  `${itemForm.plannedMonth}-01`,
    });
    if (saved) {
      setItems(prev => [...prev, saved].sort((a, b) => a.plannedMonth.localeCompare(b.plannedMonth)));
      setShowItemForm(false);
      setItemForm({ category: 'ESTRUTURA', description: '', plannedAmount: '', plannedMonth: '' });
    }
  }

  async function handleDeleteItem(id: string) {
    await deleteBudgetItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function handleSaveEntry() {
    if (!activeProjectId || !entryForm.description.trim() || !entryForm.amount || !entryForm.date) return;
    const saved = await saveFinancialEntry({
      projectId:    activeProjectId,
      budgetItemId: entryForm.budgetItemId || undefined,
      description:  entryForm.description.trim(),
      amount:       Number(entryForm.amount),
      type:         entryForm.type,
      date:         entryForm.date,
      createdBy:    currentUser?.name || '',
    });
    if (saved) {
      setEntries(prev => [saved, ...prev]);
      setShowEntryForm(false);
      setEntryForm({ type: 'EXPENSE', date: '', amount: '', description: '', budgetItemId: '' });
    }
  }

  async function handleDeleteEntry(id: string) {
    await deleteFinancialEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const filteredEntries = entryFilter === 'ALL'
    ? entries
    : entries.filter(e => e.type === entryFilter);

  const sCurveData   = buildSCurveData(items, entries);
  const categoryData = buildCategoryData(items, entries);
  const cashFlowData = buildCashFlowData(entries);

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Selecione um projeto para ver o financeiro.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="text-emerald-400" size={24} />
        <h2 className="text-xl font-semibold text-white">Financeiro</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Orçado"
          value={fmtBRL(totalPlanned)}
          colorCls="border-blue-500/20 bg-blue-500/5 text-blue-400"
        />
        <SummaryCard
          label="Total Gasto"
          value={fmtBRL(totalSpent)}
          colorCls="border-rose-500/20 bg-rose-500/5 text-rose-400"
        />
        <SummaryCard
          label="Saldo"
          value={fmtBRL(balance)}
          colorCls={balance >= 0
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
            : 'border-rose-500/20 bg-rose-500/5 text-rose-400'}
        />
        <SummaryCard
          label="% Executado"
          value={`${pctExecuted.toFixed(1)}%`}
          colorCls={pctExecuted > 100
            ? 'border-rose-500/20 bg-rose-500/5 text-rose-400'
            : pctExecuted > 90
              ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'}
        />
      </div>

      <div className="flex gap-1 border-b border-white/10">
        {(['orcamento', 'lancamentos', 'graficos'] as SubTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              subTab === tab
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            {tab === 'orcamento' ? 'Orçamento' : tab === 'lancamentos' ? 'Lançamentos' : 'Gráficos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm py-8 text-center">Carregando...</div>
      ) : (
        <>
          {subTab === 'orcamento' && (
            <OrcamentoSubTab
              items={items}
              entries={entries}
              showForm={showItemForm}
              form={itemForm}
              onFormChange={setItemForm}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
              onToggleForm={() => setShowItemForm(p => !p)}
            />
          )}

          {subTab === 'lancamentos' && (
            <LancamentosSubTab
              entries={filteredEntries}
              items={items}
              filter={entryFilter}
              onFilterChange={setEntryFilter}
              showForm={showEntryForm}
              form={entryForm}
              onFormChange={setEntryForm}
              onSave={handleSaveEntry}
              onDelete={handleDeleteEntry}
              onToggleForm={() => setShowEntryForm(p => !p)}
            />
          )}

          {subTab === 'graficos' && (
            <GraficosSubTab
              sCurveData={sCurveData}
              categoryData={categoryData}
              cashFlowData={cashFlowData}
            />
          )}
        </>
      )}
    </div>
  );
}
