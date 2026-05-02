'use client';

import { LucideIcon, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  growth?: string;
  color?: string;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  growth = "+0.0%", 
  color = "bg-blue-600/10 text-blue-500",
  className 
}: StatCardProps) {
  return (
    <div className={cn(
      "glass-card p-8 rounded-[32px] flex flex-col justify-between group",
      className
    )}>
      <div className="flex justify-between items-start">
        <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", color)}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
           <TrendingUp size={12} />
           <span className="text-[10px] font-black">{growth}</span>
        </div>
      </div>
      
      <div className="mt-8">
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
          {typeof value === 'string' && value.includes('%') && (
             <span className="text-[10px] text-slate-600 font-bold mb-1">Total</span>
          )}
        </div>
      </div>
    </div>
  );
}
