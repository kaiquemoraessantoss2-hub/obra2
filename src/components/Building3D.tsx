'use client';

import { motion } from 'framer-motion';
import { cn, getProgressPercentage } from '@/lib/utils';
import { Floor } from '@/types';

interface Building3DProps {
  floors: Floor[];
}

export default function Building3D({ floors }: Building3DProps) {
  // Sort floors descending for correct stacking
  const sortedFloors = [...floors].sort((a, b) => b.number - a.number);

  return (
    <div className="flex items-center justify-center p-12 min-h-[600px] perspective-[1200px] bg-[#050507] rounded-[40px] border border-white/5 relative overflow-hidden group">
        {/* Dynamic Volumetric Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-emerald-600/5 blur-[100px] rounded-full" />
        
        <div className="relative preserve-3d rotate-x-[25deg] rotate-z-[-20deg] scale-[0.85] transition-transform duration-1000 group-hover:rotate-z-[-25deg] transform-gpu flex flex-col-reverse items-center translate-y-[100px]">
            {sortedFloors.map((floor, i) => {
                const progress = getProgressPercentage(floor.services || []);
                const isCompleted = progress === 100;
                const isInProgress = progress > 0 && progress < 100;
                
                return (
                    <motion.div
                        key={floor.id}
                        initial={{ opacity: 0, scale: 0.8, translateZ: -100 }}
                        animate={{ opacity: 1, scale: 1, translateZ: 0 }}
                        transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                        className="relative w-48 h-10 preserve-3d"
                        style={{
                            transform: `translateZ(${i * 18}px)`,
                            zIndex: i
                        }}
                    >
                        {/* Floor Slab (Top) */}
                        <div className={cn(
                            "absolute inset-0 border border-white/10 backdrop-blur-md transition-all duration-1000",
                            isCompleted ? "bg-emerald-500/30 border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]" : 
                            isInProgress ? "bg-blue-600/30 border-blue-400/30" : "bg-white/5"
                        )}>
                            <div className="absolute inset-0 flex items-center justify-center rotate-x-[-10deg] rotate-z-[35deg] opacity-10 text-[7px] font-black text-white uppercase tracking-[3px] select-none">
                                {floor.label}
                            </div>
                            
                            {/* Inner Grid Light Effect */}
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white" />
                        </div>

                        {/* Lateral Façade (Left Wall) - With Window Pattern */}
                        <div className={cn(
                            "absolute top-0 right-full h-full w-[18px] origin-right rotate-y-[-90deg] border border-white/5",
                            isCompleted ? "bg-gradient-to-l from-emerald-600/50 to-emerald-900/50" : 
                            isInProgress ? "bg-gradient-to-l from-blue-600/50 to-blue-900/50" : "bg-gradient-to-l from-slate-800 to-slate-950"
                        )}>
                           {/* Window detail */}
                           <div className="grid grid-cols-4 gap-1 p-1 h-full w-full opacity-40">
                              {[...Array(4)].map((_, j) => (
                                 <div key={j} className={cn("h-full rounded-sm", isCompleted ? "bg-emerald-300/30" : isInProgress ? "bg-blue-300/30" : "bg-white/5")} />
                              ))}
                           </div>
                        </div>

                        {/* Frontal Façade (Front Wall) - With Led Windows */}
                        <div className={cn(
                            "absolute top-full left-0 w-full h-[18px] origin-top rotate-x-[-90deg] border border-white/5",
                            isCompleted ? "bg-gradient-to-b from-emerald-700/60 to-emerald-950/60" : 
                            isInProgress ? "bg-gradient-to-b from-blue-700/60 to-blue-950/60" : "bg-gradient-to-b from-slate-900 to-black"
                        )}>
                            {/* Led Window Pattern */}
                            <div className="grid grid-cols-8 gap-2 p-1.5 h-full w-full opacity-30">
                              {[...Array(8)].map((_, j) => (
                                 <div key={j} className={cn("h-full rounded-full transition-all duration-1000", isCompleted ? "bg-emerald-400 shadow-[0_0_5px_#10b981]" : isInProgress ? "bg-blue-400 shadow-[0_0_5px_#3b82f6]" : "bg-white/5")} />
                              ))}
                           </div>
                        </div>

                        {/* Reflection Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                    </motion.div>
                );
            })}
        </div>

        {/* Legend Panel */}
        <div className="absolute bottom-8 right-8 glass-card p-6 rounded-3xl border-white/5 backdrop-blur-xl scale-90 md:scale-100 origin-bottom-right">
            <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-4">Mapeamento Digital 3D</h4>
            <div className="space-y-3">
                <LegendItem color="bg-emerald-500" label="Sistemas Concluídos" glow="shadow-[0_0_10px_#10b981]" />
                <LegendItem color="bg-blue-500" label="Execução Física Ativa" glow="shadow-[0_0_10px_#3b82f6]" />
                <LegendItem color="bg-white/10" label="Fase Planejada" />
            </div>
        </div>
    </div>
  );
}

function LegendItem({ color, label, glow }: { color: string, label: string, glow?: string }) {
   return (
      <div className="flex items-center gap-3">
         <div className={cn("w-2.5 h-2.5 rounded-full transition-shadow duration-500", color, glow)} />
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{label}</span>
      </div>
   );
}
