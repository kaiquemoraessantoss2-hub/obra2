'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { loadGargalosByCompany } from '@/lib/auth';

interface DashboardChartsProps {
  disciplineData: any[];
  floorData: any[];
  companyId?: string;
}

export default function DashboardCharts({ disciplineData, floorData, companyId }: DashboardChartsProps) {
  const [range, setRange] = useState('6M');
  const [gargalosCount, setGargalosCount] = useState(0);
  const ranges = ['1D', '1W', '1M', '6M', '1Y'];

  useEffect(() => {
    if (companyId) {
      const gargalos = loadGargalosByCompany(companyId);
      setGargalosCount(gargalos.length);
    }
  }, [companyId]);

  return (
    <div className="space-y-8">
      <div className="glass-card p-10 rounded-[32px]">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-black text-white">Performance da Obra</h3>
            <p className="text-sm text-slate-500 font-medium">Histórico de evolução física das disciplinas.</p>
          </div>
          <div className="flex bg-white/[0.03] p-1.5 rounded-full border border-white/5">
            {ranges.map(r => (
              <button 
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-5 py-2 rounded-full text-[10px] font-black tracking-tight transition-all",
                  range === r ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={disciplineData}>
              <defs>
                <linearGradient id="colorProg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.03} strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0d0d10', 
                  borderColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  padding: '12px'
                }} 
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}
              />
              <Area 
                type="monotone" 
                dataKey="progress" 
                stroke="#2563eb" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorProg)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="glass-card p-10 rounded-[32px]">
            <h4 className="text-white font-black mb-6 flex justify-between items-center">
               Visão por Disciplina
               <span className="text-[10px] text-blue-500">Ver Todas</span>
            </h4>
            <div className="space-y-6">
               {disciplineData.map(d => (
                 <div key={d.name} className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                       <span className="text-slate-400">{d.name}</span>
                       <span className="text-white">{d.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600 rounded-full" style={{ width: `${d.progress}%` }} />
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="glass-card p-10 rounded-[32px] bg-gradient-to-br from-[#0d0d10] to-[#121218] border-blue-500/10">
            <h4 className="text-white font-black mb-2">Resumo Operacional</h4>
            <p className="text-slate-500 text-xs mb-8">Status atualizado dos andares.</p>
            <div className="flex flex-col gap-4">
<div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                   <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                     <AlertTriangle size={20} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white">{gargalosCount} Gargalos Detectados</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ação Necessária</p>
                   </div>
                </div>
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Fluxo de Caixa Positivo</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saúde Financeira</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
