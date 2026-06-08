'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, CreditCard, DollarSign, Plus, TrendingUp, X } from 'lucide-react';
import StatCard from '@/components/StatCard';

interface BillingPanelProps {
  companies: any[];
}

export default function BillingPanel({ companies }: BillingPanelProps) {
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const totalMRR = companies.reduce((acc, c) => acc + (c.plan === 'Pro' ? 499 : c.plan === 'Empresa' ? 1200 : 199), 0);
  const activeSubs = companies.filter(c => c.billingStatus === 'ACTIVE').length;

  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Faturamento SaaS</h1>
          <p className="text-slate-500 text-sm">Gestão financeira e controle de planos.</p>
        </div>
        <button onClick={() => setShowNewPlanModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="MRR Atual" value={`R$ ${totalMRR.toLocaleString()}`} icon={DollarSign} color="text-emerald-500 bg-emerald-500/10" />
        <StatCard title="Assinaturas Ativas" value={activeSubs.toString()} icon={CreditCard} color="text-blue-500 bg-blue-500/10" />
        <StatCard title="Crescimento" value="+12.4%" icon={TrendingUp} color="text-emerald-500 bg-emerald-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-10 rounded-[40px] border-white/5">
          <h3 className="text-xl font-black text-white mb-8">Performance Mensal</h3>
          <div className="h-[200px] flex items-end gap-2 px-2">
            {[45, 60, 55, 75, 80, 70, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 transition-all rounded-t-xl relative group cursor-pointer" style={{ height: `${h}%` }}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded font-black opacity-0 group-hover:opacity-100 transition-all">R$ {h * 100}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black text-slate-600 uppercase">
            <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
          </div>
        </div>

        <div className="glass-card p-10 rounded-[40px] border-white/5">
          <h3 className="text-xl font-black text-white mb-8">Inadimplência e Alertas</h3>
          <div className="space-y-6">
            {companies.filter(c => c.billingStatus === 'OVERDUE').map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500"><AlertTriangle size={20} /></div>
                  <div>
                    <p className="text-white font-bold text-sm">{c.name}</p>
                    <p className="text-[10px] text-rose-500/70 font-black uppercase">Fatura Atrasada há 5 dias</p>
                  </div>
                </div>
                <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-xl">Cobrar</button>
              </div>
            ))}
            {companies.filter(c => c.billingStatus === 'OVERDUE').length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600 space-y-4">
                <CheckCircle size={40} className="opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Sem inadimplência hoje</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 rounded-[32px] border-white/10 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">Criar Novo Plano</h3>
              <button onClick={() => setShowNewPlanModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Plano</label>
                <input type="text" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500" placeholder="Ex: Premium" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Valor Mensal (R$)</label>
                <input type="number" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500" placeholder="Ex: 299" />
              </div>
              <button className="w-full btn-primary py-4 mt-4">Criar Plano</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
