'use client';

import { useRef, useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Clock, Plus, Upload, Trash2 } from 'lucide-react';

import { Floor, Status, Service } from '@/types';
import { cn } from '@/lib/utils';

interface FloorDetailProps {
  floor: Floor | null;
  onClose: () => void;
  onStatusChange: (floorId: string, serviceName: string, newStatus: Status) => void;
  onPhotoUpload?: (floorId: string, photos: string[]) => void;
  existingPhotos?: string[];
}

export default function FloorDetail({ floor, onClose, onStatusChange, onPhotoUpload, existingPhotos = [] }: FloorDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(existingPhotos || []);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPhotos(existingPhotos || []);
  }, [existingPhotos, floor?.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !floor) return;
    
    setUploading(true);
    const newPhotos: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newPhotos.push(dataUrl);
    }
    
    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    if (onPhotoUpload) {
      onPhotoUpload(floor.id, updatedPhotos);
    }
    setUploading(false);
  };

  if (!floor) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] glass-panel z-[60] p-8 flex flex-col animate-fade-in overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-600/50" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{floor.label}</h2>
          <p className="text-sm text-slate-400">Fase atual: <span className="text-blue-400 font-semibold uppercase">{floor.phase}</span></p>
        </div>

        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2 no-scrollbar">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Disciplinas</h3>
        
        {(floor.services || []).map((service) => (
          <div key={service.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-200">{service.name}</span>
              <StatusBadge status={service.status} />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatusButton 
                active={service.status === 'NOT_STARTED'} 
                label="Pendente"
                onClick={() => onStatusChange(floor.id, service.name, 'NOT_STARTED')}
                icon={Circle}
                color="text-slate-500"
              />
              <StatusButton 
                active={service.status === 'IN_PROGRESS'} 
                label="Iniciado"
                onClick={() => onStatusChange(floor.id, service.name, 'IN_PROGRESS')}
                icon={Clock}
                color="text-blue-500"
              />
              <StatusButton 
                active={service.status === 'COMPLETED'} 
                label="Concluído"
                onClick={() => onStatusChange(floor.id, service.name, 'COMPLETED')}
                icon={CheckCircle2}
                color="text-emerald-500"
              />
            </div>
          </div>
        ))}

<div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Fotos do Estágio</h3>
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-video bg-white/5 rounded-lg border border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all disabled:opacity-50"
              >
                 {uploading ? (
                   <span className="text-[10px] text-blue-500">Enviando...</span>
                 ) : (
                   <>
                     <Upload size={16} className="text-slate-500 mb-1" />
                     <span className="text-[10px] text-slate-500">Enviar Foto</span>
                   </>
                 )}
              </button>
              {photos.map((photo, idx) => (
                <div key={idx} className="aspect-video bg-slate-800 rounded-lg overflow-hidden border border-white/5 group relative">
                   <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" />
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 gap-2">
                     <button 
                       onClick={() => {
                         const updated = photos.filter((_, i) => i !== idx);
                         setPhotos(updated);
                         if (onPhotoUpload) {
                           onPhotoUpload(floor.id, updated);
                         }
                       }}
                       className="p-2 bg-rose-600/80 rounded-lg text-white hover:bg-rose-600"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                </div>
              ))}
              {photos.length === 0 && (
                <div className="aspect-video bg-slate-800 rounded-lg border border-white/5 flex items-center justify-center">
                   <span className="text-[10px] text-slate-600">Sem fotos</span>
                </div>
              )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5">

          <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Ações Rápidas</h3>
          <button 
            onClick={() => {
              let csv = "Disciplina,Status\n";
              floor.services.forEach(s => {
                csv += `${s.name},${s.status}\n`;
              });
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `relatorio_andar_${floor.number}.csv`;
              a.click();
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
          >
            Gerar Relatório do Andar
          </button>
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const configs = {
    NOT_STARTED: { color: 'bg-slate-500/10 text-slate-500', label: 'Não Iniciado' },
    IN_PROGRESS: { color: 'bg-blue-500/10 text-blue-500', label: 'Em Andamento' },
    COMPLETED: { color: 'bg-emerald-500/10 text-emerald-500', label: 'Concluído' },
    DELAYED: { color: 'bg-amber-500/10 text-amber-500', label: 'Atrasado' },
    BLOCKED: { color: 'bg-rose-500/10 text-rose-500', label: 'Bloqueado' },
  };
  const config = configs[status as keyof typeof configs] || configs.NOT_STARTED;
  return <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-full", config.color)}>{config.label}</span>;
}

function StatusButton({ active, label, onClick, icon: Icon, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
        active ? "bg-white/5 border-white/10" : "border-transparent opacity-40 hover:opacity-100"
      )}
    >
      <Icon size={18} className={cn(color)} />
      <span className="text-[10px] font-medium text-slate-300">{label}</span>
    </button>
  );
}
