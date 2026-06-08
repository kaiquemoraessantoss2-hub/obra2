'use client';

import { useState } from 'react';
import {
  AlertTriangle, BarChart3, Building, CreditCard,
  Eye, PauseCircle, PlayCircle, RefreshCw, Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import StatCard from '@/components/StatCard';
import { cn } from '@/lib/utils';

interface AdminPanelProps {
  companies: any[];
  users: any[];
  togglePause: (id: string) => void;
  impersonate: (id: string) => void;
  onRenew: (id: string) => void;
  onToggleUser: (userId: string, isActive: boolean) => void;
  onDeleteUser: (userId: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onChangePlan?: (companyId: string, currentPlan: string) => void;
}

function PlanBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = Math.round((count / (total || 1)) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{count} ({percent}%)</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full', color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function AdminPanel({
  companies, users, togglePause, impersonate,
  onRenew, onToggleUser, onDeleteUser, onRefresh, onReset, onChangePlan,
}: AdminPanelProps) {
  const now = new Date();

  const expiringSoon = companies.filter((c: any) => {
    const startDate = c.planStartDate ? new Date(c.planStartDate) : new Date(c.createdAt);
    const endDate = c.planEndDate ? new Date(c.planEndDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 && daysRemaining <= 7;
  }).length;

  const totalMRR = companies.reduce((sum: number, c: any) => sum + (c.monthlyValue || 0), 0);
  const avgLTV = companies.length > 0 ? Math.round(totalMRR * 12 / companies.length) : 0;

  const financialData = [
    { name: 'Jan', mrr: Math.round(totalMRR * 0.3) },
    { name: 'Fev', mrr: Math.round(totalMRR * 0.35) },
    { name: 'Mar', mrr: Math.round(totalMRR * 0.5) },
    { name: 'Abr', mrr: Math.round(totalMRR * 0.65) },
    { name: 'Mai', mrr: Math.round(totalMRR * 0.8) },
    { name: 'Jun', mrr: totalMRR },
  ];

  const planCounts: Record<string, number> = { Básico: 0, Pro: 0, Empresa: 0 };
  companies.forEach((c: any) => {
    if (planCounts[c.plan] !== undefined) planCounts[c.plan]++;
  });

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={onReset} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
          <Trash2 size={14} /> Resetar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="MRR Total" value={`R$ ${(totalMRR / 1000).toFixed(1)}k`} icon={CreditCard} growth="+12%" />
        <StatCard title="Churn Rate" value="1.2%" icon={AlertTriangle} color="bg-rose-500/10 text-rose-500" growth="-0.4%" />
        <StatCard title="Empresas" value={companies.length} icon={Building} color="bg-blue-500/10 text-blue-400" />
        <StatCard title="LTV Médio" value={`R$ ${(avgLTV / 1000).toFixed(1)}k`} icon={BarChart3} color="bg-emerald-500/10 text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 glass-card p-10 rounded-[40px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white">Crescimento de Receita (MRR)</h3>
              <p className="text-sm text-slate-500">Evolução mensal das assinaturas ativas.</p>
            </div>
            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">Meta: R$ 50k</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.03} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0d0d10', border: 'none', borderRadius: '16px' }} />
                <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={4} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-10 rounded-[40px] flex flex-col">
          <h3 className="text-xl font-black text-white mb-8">Planos Populares</h3>
          <div className="space-y-6 flex-1">
            <PlanBar label="Básico" count={planCounts['Básico']} total={companies.length} color="bg-slate-700" />
            <PlanBar label="Pro" count={planCounts['Pro']} total={companies.length} color="bg-blue-600" />
            <PlanBar label="Empresa" count={planCounts['Empresa']} total={companies.length} color="bg-indigo-600" />
          </div>
          <div className="mt-10 p-6 bg-blue-600/10 rounded-3xl border border-blue-600/20">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Avisos Financeiros</p>
            <p className="text-white text-sm font-bold">{expiringSoon} assinatura{expiringSoon !== 1 ? 's' : ''} expira em até 7 dias</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[40px] p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white">Carteira de Clientes</h2>
          <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all">Exportar Financeiro</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="pb-6">Cliente</th>
                <th className="pb-6">Plano</th>
                <th className="pb-6">Valor/Mês</th>
                <th className="pb-6">Início</th>
                <th className="pb-6">Expira em</th>
                <th className="pb-6">Dias Rest.</th>
                <th className="pb-6">Status</th>
                <th className="pb-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {companies.filter((c: any) => c.id).map((c: any) => {
                const fallbackDate = new Date();
                const startDate = c.planStartDate ? new Date(c.planStartDate) : (c.createdAt ? new Date(c.createdAt) : fallbackDate);
                const validStart = isNaN(startDate.getTime()) ? fallbackDate : startDate;
                const endDate = c.planEndDate ? new Date(c.planEndDate) : new Date(validStart.getTime() + 30 * 24 * 60 * 60 * 1000);
                const validEnd = isNaN(endDate.getTime()) ? new Date(fallbackDate.getTime() + 30 * 24 * 60 * 60 * 1000) : endDate;
                const daysRemaining = Math.max(0, Math.ceil((validEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                const isExpired = daysRemaining <= 0;
                const createdLabel = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : validStart.toLocaleDateString();
                return (
                  <tr key={c.id} className="hover:bg-white/[0.01] group">
                    <td className="py-6">
                      <p className="text-white font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-500">Criado em {createdLabel}</p>
                    </td>
                    <td className="py-6"><span className="text-xs font-bold text-slate-400">{c.plan}</span></td>
                    <td className="py-6 font-black text-white text-sm">R$ {c.monthlyValue || 0}</td>
                    <td className="py-6 text-slate-400 text-xs">{validStart.toLocaleDateString()}</td>
                    <td className="py-6 text-slate-400 text-xs">{validEnd.toLocaleDateString()}</td>
                    <td className="py-6">
                      <span className={cn('px-2 py-1 rounded text-[10px] font-black', isExpired ? 'bg-rose-500/20 text-rose-400' : daysRemaining <= 7 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400')}>
                        {isExpired ? 'Expirado' : `${daysRemaining} dias`}
                      </span>
                    </td>
                    <td className="py-6">
                      <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase', c.billingStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
                        {c.billingStatus}
                      </span>
                    </td>
                    <td className="py-6 text-right space-x-3">
                      <button onClick={() => togglePause(c.id)} className={cn('p-3 rounded-2xl transition-all', c.isPaused ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
                        {c.isPaused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                      </button>
                      <button onClick={() => onChangePlan && onChangePlan(c.id, c.plan)} className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl hover:bg-blue-600/20 transition-all" title="Alterar Plano">
                        <RefreshCw size={20} />
                      </button>
                      <button onClick={() => impersonate(c.id)} className="p-3 bg-white/5 text-slate-400 rounded-2xl hover:text-white transition-all">
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card rounded-[40px] p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white">Gerenciamento de Usuários</h2>
          <button onClick={onRefresh} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="pb-6">Usuário</th>
                <th className="pb-6">E-mail</th>
                <th className="pb-6">Empresa</th>
                <th className="pb-6">Cargo</th>
                <th className="pb-6">Status</th>
                <th className="pb-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.filter((u: any) => u.role !== 'SUPERADMIN').map((u: any) => {
                const userCompany = companies.find((c: any) => c.id === u.companyId);
                const isActive = u.isActive !== false;
                return (
                  <tr key={u.id} className="hover:bg-white/[0.01] group">
                    <td className="py-6"><p className="text-white font-bold">{u.name}</p></td>
                    <td className="py-6 text-slate-400 text-sm">{u.email}</td>
                    <td className="py-6 text-slate-400 text-sm">{userCompany?.name || 'N/A'}</td>
                    <td className="py-6"><span className="text-xs font-bold text-slate-400">{u.role}</span></td>
                    <td className="py-6">
                      <span className={cn('px-2 py-1 rounded text-[10px] font-black', isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400')}>
                        {isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-6 text-right space-x-3">
                      <button onClick={() => onToggleUser(u.id, !isActive)} className={cn('p-3 rounded-2xl transition-all', isActive ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20')}>
                        {isActive ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                      </button>
                      {u.role !== 'SUPERADMIN' && (
                        <button onClick={() => onDeleteUser(u.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500/20 transition-all">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
