'use client';

import { motion } from 'framer-motion';
import { cn, getProgressPercentage } from '@/lib/utils';
import { Floor } from '@/types';

interface BuildingMapProps {
  floors: Floor[];
  selectedFloor?: number;
  onFloorClick: (floor: Floor) => void;
}

export default function BuildingMap({ floors, selectedFloor, onFloorClick }: BuildingMapProps) {
  // Sort floors descending to show higher floors at the top
  const sortedFloors = [...floors].sort((a, b) => b.number - a.number);

  return (
    <div className="flex flex-col gap-1.5 p-4 glass-card rounded-2xl w-full max-h-[80vh] overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-semibold text-slate-200">Mapa do Prédio</h3>
        <span className="text-xs text-slate-500">{floors.length} Andares</span>
      </div>
      
      {sortedFloors.map((floor) => {
        const progress = getProgressPercentage(floor.services || []);
        const isSelected = selectedFloor === floor.number;

        return (
          <motion.div
            key={floor.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onFloorClick(floor)}
            className={cn(
              "relative cursor-pointer h-10 rounded-md transition-all duration-300 flex items-center px-4 border overflow-hidden",
              isSelected 
                ? "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                : "border-white/5 hover:border-white/10"
            )}
            style={{
              background: `linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) ${progress}%, transparent ${progress}%)`
            }}
          >
            <div className="flex justify-between w-full items-center z-10">
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-blue-400" : "text-slate-400"
              )}>
                {floor.label}
              </span>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold",
                  floor.type === 'REGULAR' ? "border-slate-800 text-slate-500" : "border-blue-500/30 text-blue-400"
                )}>
                  {floor.type}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {progress}%
                </span>
              </div>
            </div>

            
            {/* Phase Indicator Strip */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              floor.phase === 'Finalization' ? 'bg-emerald-500' :
              floor.phase === 'Finishing' ? 'bg-blue-500' :
              floor.phase === 'Masonry' ? 'bg-orange-500' : 'bg-slate-500'
            )} />
          </motion.div>
        );
      })}
    </div>
  );
}
