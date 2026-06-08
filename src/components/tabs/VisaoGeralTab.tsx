'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, LayoutGrid } from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import {
  loadAllBudgetItems, loadAllFinancialEntries,
  buildSCurveData,
  BudgetItem, FinancialEntry, SCurvePoint,
} from '@/lib/financeiro';
import { getProgressPercentage } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectFinancials {
  projectId: string;
  totalPlanned: number;
  totalSpent: number;
  balance: number;
  sCurve: SCurvePoint[];
  alert: 'ESTOURADO' | 'SEM_ORCAMENTO' | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcPhysicalProgress(floors: any[]): number {
  if (!floors || floors.length === 0) return 0;
  const allServices = floors.flatMap((f: any) => f.services || []);
  return getProgressPercentage(allServices);
}

function aggregateFinancials(
  projectId: string,
  items: BudgetItem[],
  entries: FinancialEntry[],
): ProjectFinancials {
  const projItems = items.filter(i => i.projectId === projectId);
  const projEntries = entries.filter(e => e.projectId === projectId);
  const totalPlanned = projItems.reduce((s, i) => s + i.plannedAmount, 0);
  const totalSpent = projEntries
    .filter(e => e.type === 'EXPENSE')
    .reduce((s, e) => s + e.amount, 0);
  const balance = totalPlanned - totalSpent;
  const sCurve = buildSCurveData(projItems, projEntries);
  const alert: ProjectFinancials['alert'] =
    totalPlanned === 0 ? 'SEM_ORCAMENTO' :
    totalSpent > totalPlanned ? 'ESTOURADO' :
    null;
  return { projectId, totalPlanned, totalSpent, balance, sCurve, alert };
}

// ─── Sub-component: single project card ──────────────────────────────────────

interface ProjectCardProps {
  project: { id: string; name: string; location?: string; floors?: any[] };
  financials: ProjectFinancials;
  onClick: () => void | Promise<void>;
}

function ProjectCard({ project, financials, onClick }: ProjectCardProps) {
  const progress = calcPhysicalProgress(project.floors || []);
  const { totalPlanned, totalSpent, balance, sCurve, alert } = financials;

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-[32px] p-8 text-left hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer border border-white/5 hover:border-blue-500/30 w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0 mr-4">
          <h3 className="text-lg font-black text-white truncate">{project.name}</h3>
          <p className="text-xs text-slate-500 mt-1 truncate">{project.location || 'Sem localização'}</p>
        </div>
        {alert === 'ESTOURADO' && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-400 text-[10px] font-black uppercase tracking-widest shrink-0">
            <AlertTriangle size={10} /> Estourado
          </span>
        )}
        {alert === 'SEM_ORCAMENTO' && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-widest shrink-0">
            <TrendingDown size={10} /> Sem orçamento
          </span>
        )}
      </div>

      {/* Physical progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso Físico</span>
          <span className="text-sm font-black text-white">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: progress >= 80 ? '#22c55e' : progress >= 40 ? '#3b82f6' : '#f59e0b',
            }}
          />
        </div>
      </div>

      {/* Financial row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/[0.03] rounded-2xl p-3">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Orçado</p>
          <p className="text-xs font-black text-slate-300 truncate">{fmtBRL(totalPlanned)}</p>
        </div>
        <div className="bg-white/[0.03] rounded-2xl p-3">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Gasto</p>
          <p className={`text-xs font-black truncate ${alert === 'ESTOURADO' ? 'text-rose-400' : 'text-slate-300'}`}>
            {fmtBRL(totalSpent)}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-2xl p-3">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Saldo</p>
          <p className={`text-xs font-black truncate ${balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {fmtBRL(balance)}
          </p>
        </div>
      </div>

      {/* Mini S-Curve */}
      {sCurve.length > 0 && (
        <div className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <Tooltip
                contentStyle={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 10 }}
                formatter={(value) => fmtBRL(Number(value))}
              />
              <Line type="monotone" dataKey="planned" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Planejado" />
              <Line type="monotone" dataKey="real" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Real" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {sCurve.length === 0 && (
        <div className="h-[100px] w-full flex items-center justify-center">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sem dados financeiros</p>
        </div>
      )}
    </button>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function VisaoGeralTab() {
  const { companyProjects, selectProject, setActiveTab } = useAppContext();

  const [allItems, setAllItems] = useState<BudgetItem[]>([]);
  const [allEntries, setAllEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = companyProjects.map(p => p.id);
    setLoading(true);
    Promise.all([
      loadAllBudgetItems(ids),
      loadAllFinancialEntries(ids),
    ]).then(([items, entries]) => {
      setAllItems(items);
      setAllEntries(entries);
      setLoading(false);
    }).catch(() => {
      setAllItems([]);
      setAllEntries([]);
      setLoading(false);
    });
  }, [companyProjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (companyProjects.length === 0) {
    return (
      <div className="glass-card rounded-[40px] p-16 flex flex-col items-center gap-4">
        <LayoutGrid size={40} className="text-slate-600" />
        <p className="text-slate-500 font-black text-sm uppercase tracking-widest">Nenhum projeto cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">{companyProjects.length} {companyProjects.length === 1 ? 'obra' : 'obras'} em acompanhamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {companyProjects.map(project => {
          const financials = aggregateFinancials(project.id, allItems, allEntries);
          return (
            <ProjectCard
              key={project.id}
              project={project}
              financials={financials}
              onClick={async () => {
                await selectProject(project.id);
                setActiveTab('dashboard');
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
