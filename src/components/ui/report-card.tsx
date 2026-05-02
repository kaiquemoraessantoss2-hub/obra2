import { Download, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCardProps {
  title: string;
  desc: string;
  onClick: () => void;
}

export default function ReportCard({ title, desc, onClick }: ReportCardProps) {
  return (
    <div 
      onClick={onClick} 
      className="glass-card p-10 rounded-[40px] border-white/5 hover:bg-white/5 cursor-pointer flex flex-col justify-between group"
    >
      <div>
        <Download className="text-blue-500 mb-6 group-hover:scale-110 transition-transform" size={40} />
        <h4 className="text-xl font-black text-white mb-2">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
      </div>
      <div className="mt-8 flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest">
        Baixar Agora <ChevronRight size={14} />
      </div>
    </div>
  );
}