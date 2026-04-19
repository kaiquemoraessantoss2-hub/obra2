'use client';

import { useState, useEffect } from 'react';
import { Building2, MapPin, Layers, Home, Waves, Sun, Clock, Hash, Users, X, AlertTriangle, Check } from 'lucide-react';
import { BuildingConfig, Floor, FloorType } from '@/types';
import { cn } from '@/lib/utils';

interface BuildingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: BuildingConfig) => void;
  existingConfig?: BuildingConfig | null;
}

const FLOOR_TYPES: { value: FloorType; label: string }[] = [
  { value: 'BASEMENT', label: 'Subsolo' },
  { value: 'GROUND', label: 'Térreo' },
  { value: 'LEISURE', label: 'Lazer' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'TECHNICAL', label: 'Técnico' },
];

export default function BuildingConfigModal({ isOpen, onClose, onSave, existingConfig }: BuildingConfigModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    totalFloors: 15,
    basements: 2,
    hasLeisure: true,
    hasAtrium: false,
    hasRooftop: false,
    technicalAreas: 1,
    apartmentsPerFloor: 4,
    totalUnits: 0,
  });

  const [previewFloors, setPreviewFloors] = useState<Floor[]>([]);
  const [hasExistingFloors, setHasExistingFloors] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    if (existingConfig) {
      setFormData({
        name: existingConfig.name,
        address: existingConfig.address,
        totalFloors: existingConfig.totalFloors,
        basements: existingConfig.basements,
        hasLeisure: existingConfig.hasLeisure,
        hasAtrium: existingConfig.hasAtrium,
        hasRooftop: existingConfig.hasRooftop,
        technicalAreas: existingConfig.technicalAreas,
        apartmentsPerFloor: existingConfig.apartmentsPerFloor,
        totalUnits: existingConfig.totalUnits,
      });
      setHasExistingFloors(existingConfig.floors && existingConfig.floors.length > 0);
    } else {
      setFormData({
        name: 'Residencial Aurora',
        address: '',
        totalFloors: 15,
        basements: 2,
        hasLeisure: true,
        hasAtrium: false,
        hasRooftop: false,
        technicalAreas: 1,
        apartmentsPerFloor: 4,
        totalUnits: 60,
      });
      setHasExistingFloors(false);
    }
  }, [existingConfig, isOpen]);

  useEffect(() => {
    const totalUnits = formData.totalFloors * formData.apartmentsPerFloor + 
      (formData.hasLeisure ? formData.apartmentsPerFloor : 0) +
      (formData.basements * 0);
    setFormData(prev => ({ ...prev, totalUnits }));
  }, [formData.totalFloors, formData.apartmentsPerFloor, formData.hasLeisure]);

  const generateFloors = (): Floor[] => {
    const floors: Floor[] = [];
    let floorId = 0;

    for (let i = formData.basements; i >= 1; i--) {
      floors.push({
        id: `f_${floorId++}`,
        number: -i,
        label: `Subsolo ${i}`,
        type: 'BASEMENT',
        phase: 'Structure',
        services: [],
      });
    }

    floors.push({
      id: `f_${floorId++}`,
      number: 0,
      label: 'Térreo',
      type: 'GROUND',
      phase: 'Structure',
      services: [],
    });

    if (formData.hasLeisure) {
      floors.push({
        id: `f_${floorId++}`,
        number: 1,
        label: 'Lazer',
        type: 'LEISURE',
        phase: 'Finishing',
        services: [],
      });
      floorId++;
    }

    for (let i = 1; i <= formData.totalFloors; i++) {
      floors.push({
        id: `f_${floorId++}`,
        number: formData.hasLeisure ? i + 1 : i,
        label: `${formData.hasLeisure ? i + 1 : i}º Andar`,
        type: 'REGULAR',
        phase: 'Masonry',
        services: [],
      });
    }

    if (formData.hasAtrium) {
      floors.push({
        id: `f_${floorId++}`,
        number: floors.length,
        label: 'Átrio',
        type: 'ATRIUM',
        phase: 'Finishing',
        services: [],
      });
    }

    if (formData.hasRooftop) {
      floors.push({
        id: `f_${floorId++}`,
        number: floors.length + 1,
        label: 'Cobertura',
        type: 'ROOFTOP',
        phase: 'Finalization',
        services: [],
      });
    }

    for (let i = 1; i <= formData.technicalAreas; i++) {
      floors.push({
        id: `f_${floorId++}`,
        number: floors.length + 1,
        label: i === 1 ? 'Área Técnica' : `Área Técnica ${i}`,
        type: 'TECHNICAL',
        phase: 'Technical',
        services: [],
      });
    }

    return floors;
  };

  useEffect(() => {
    if (isOpen) {
      setPreviewFloors(generateFloors());
    }
  }, [formData, isOpen]);

  const handleSubmit = () => {
    if (hasExistingFloors && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }

    const config: BuildingConfig = {
      id: existingConfig?.id || `bc_${Date.now()}`,
      name: formData.name,
      address: formData.address,
      totalFloors: formData.totalFloors,
      basements: formData.basements,
      hasLeisure: formData.hasLeisure,
      hasAtrium: formData.hasAtrium,
      hasRooftop: formData.hasRooftop,
      technicalAreas: formData.technicalAreas,
      apartmentsPerFloor: formData.apartmentsPerFloor,
      totalUnits: formData.totalFloors * formData.apartmentsPerFloor,
      floors: previewFloors,
      createdAt: existingConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-10 rounded-[40px] border-white/5 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
            <Building2 className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Configurar Prédio</h2>
            <p className="text-slate-500 text-sm">Defina as características do empreendimento</p>
          </div>
        </div>

        {confirmOverwrite && (
          <div className="mb-8 p-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-500" size={20} />
              <p className="text-amber-500 font-black text-sm">Atenção: pavimentos existentes</p>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Este empreendimento já possui {existingConfig?.floors.length} pavimentos cadastrados. 
              Ao gerar nova configuração, os dados de execução por andar serão Resetados.
            </p>
            <button 
              onClick={() => setConfirmOverwrite(false)}
              className="text-amber-500 text-sm font-bold hover:underline"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <Building2 size={12} /> Nome do Empreendimento
              </label>
              <input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
                placeholder="Ex: Residencial Aurora"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <MapPin size={12} /> Endereço
              </label>
              <input 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
                placeholder="RuaExemple, 123"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <Layers size={12} /> Andares Tipo
              </label>
              <input 
                type="number"
                min={1}
                value={formData.totalFloors}
                onChange={(e) => setFormData({ ...formData, totalFloors: parseInt(e.target.value) || 1 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <Layers size={12} /> Subsolos
              </label>
              <input 
                type="number"
                min={0}
                value={formData.basements}
                onChange={(e) => setFormData({ ...formData, basements: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <Home size={12} /> Apts/Andar
              </label>
              <input 
                type="number"
                min={1}
                value={formData.apartmentsPerFloor}
                onChange={(e) => setFormData({ ...formData, apartmentsPerFloor: parseInt(e.target.value) || 1 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <Users size={12} /> Total Unidades
              </label>
              <div className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-6 py-4 text-slate-400 font-bold">
                {formData.totalUnits}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl cursor-pointer hover:border-white/20 transition-all">
              <input 
                type="checkbox"
                checked={formData.hasLeisure}
                onChange={(e) => setFormData({ ...formData, hasLeisure: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <Waves className="text-blue-500" size={16} />
              <span className="text-white text-sm font-bold">Pavimento Lazer</span>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl cursor-pointer hover:border-white/20 transition-all">
              <input 
                type="checkbox"
                checked={formData.hasAtrium}
                onChange={(e) => setFormData({ ...formData, hasAtrium: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <Sun className="text-amber-500" size={16} />
              <span className="text-white text-sm font-bold">Possui Átrio</span>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl cursor-pointer hover:border-white/20 transition-all">
              <input 
                type="checkbox"
                checked={formData.hasRooftop}
                onChange={(e) => setFormData({ ...formData, hasRooftop: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <Home className="text-emerald-500" size={16} />
              <span className="text-white text-sm font-bold">Possui Cobertura</span>
            </label>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 ml-1 uppercase flex items-center gap-2">
                <Hash size={12} /> Áreas Técnicas
              </label>
              <input 
                type="number"
                min={0}
                value={formData.technicalAreas}
                onChange={(e) => setFormData({ ...formData, technicalAreas: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-3 text-white font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-8">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Check size={18} className="text-emerald-500" />
              Preview dos Pavimentos
            </h3>
            <div className="glass-card p-4 rounded-2xl max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {previewFloors.slice(0, 20).map((floor, idx) => (
                  <span 
                    key={floor.id}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black",
                      floor.type === 'BASEMENT' && "bg-slate-700/50 text-slate-400",
                      floor.type === 'GROUND' && "bg-blue-600/20 text-blue-400",
                      floor.type === 'LEISURE' && "bg-purple-600/20 text-purple-400",
                      floor.type === 'REGULAR' && "bg-emerald-600/20 text-emerald-400",
                      floor.type === 'TECHNICAL' && "bg-amber-600/20 text-amber-400",
                    )}
                  >
                    {floor.label}
                  </span>
                ))}
                {previewFloors.length > 20 && (
                  <span className="px-3 py-1 text-xs font-black text-slate-500">
                    +{previewFloors.length - 20} mais...
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-4">
                Total: {previewFloors.length} pavimentos
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8 mt-8 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2">
            <Check size={18} />
            {hasExistingFloors ? 'Atualizar Configuração' : 'Gerar Pavimentos'}
          </button>
        </div>
      </div>
    </div>
  );
}