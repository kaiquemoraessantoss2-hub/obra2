'use client';

import React, { useState } from 'react';
import { Pencil, X, Check, MapPin, Building, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, Floor, Status } from '@/types';
import { cn } from '@/lib/utils';
import { saveProject } from '@/lib/auth';

interface Props {
  project: Project;
  companyId: string;
  onUpdate: (project: Project) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function ProjectEditCard({ project, companyId, onUpdate, onDelete, onClose }: Props) {
  const [editData, setEditData] = useState({
    name: project.name,
    location: project.location,
    totalFloors: project.totalFloors,
    basements: project.basements,
    hasLeisure: project.hasLeisure,
    hasAtrium: project.hasAtrium,
    technicalAreas: project.technicalAreas || 0,
  });
  const [showFloorEdit, setShowFloorEdit] = useState(false);
  const floors = project.floors || [];

  const handleChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const updated: Project = {
      ...project,
      name: editData.name,
      location: editData.location,
      totalFloors: editData.totalFloors,
      basements: editData.basements,
      hasLeisure: editData.hasLeisure,
      hasAtrium: editData.hasAtrium,
      technicalAreas: editData.technicalAreas,
    };
    onUpdate(updated);
    onClose();
  };

  const addFloor = (type: 'BASEMENT' | 'REGULAR' | 'GROUND') => {
    const newFloors = [...floors];
    const existingNumbers = newFloors.map(f => f.number);
    
    let newNumber = 1;
    if (type === 'BASEMENT') {
      newNumber = -1 * (editData.basements + 1);
      while (existingNumbers.includes(newNumber)) newNumber--;
    } else if (type === 'GROUND') {
      newNumber = 0;
    } else {
      while (existingNumbers.includes(newNumber) || newNumber <= 0) newNumber++;
    }

    const label = type === 'BASEMENT' ? `Subsolo ${Math.abs(newNumber)}` 
                 : type === 'GROUND' ? 'Térreo'
                 : `${newNumber}º Andar`;

    const newFloor: Floor = {
      id: `f_${Date.now()}`,
      number: newNumber,
      label,
      type,
      phase: 'Structure',
      services: [
        { id: `s_${Date.now()}_1`, name: 'Elétrica', status: 'NOT_STARTED' as Status },
        { id: `s_${Date.now()}_2`, name: 'Hidráulica', status: 'NOT_STARTED' as Status },
        { id: `s_${Date.now()}_3`, name: 'Alvenaria', status: 'NOT_STARTED' as Status },
        { id: `s_${Date.now()}_4`, name: 'Revestimento', status: 'NOT_STARTED' as Status },
      ]
    };

    const updated: Project = {
      ...project,
      floors: [...newFloors, newFloor].sort((a, b) => a.number - b.number)
    };
    onUpdate(updated);
  };

  const removeFloor = (floorId: string) => {
    const updated: Project = {
      ...project,
      floors: floors.filter(f => f.id !== floorId)
    };
    onUpdate(updated);
  };

  const updateFloorStatus = (floorId: string, serviceName: string, status: Status) => {
    const updated: Project = {
      ...project,
      floors: floors.map(f => {
        if (f.id !== floorId) return f;
        return {
          ...f,
          services: f.services.map(s => s.name === serviceName ? { ...s, status } : s)
        };
      })
    };
    onUpdate(updated);
  };

  const getProgressForFloor = (floor: Floor) => {
    const done = floor.services.filter(s => s.status === 'COMPLETED').length;
    return Math.round((done / floor.services.length) * 100);
  };

  return (
    <div className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">Editar Projeto</h2>
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Nome do Projeto</label>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold"
            placeholder="Ex: Residencial XYZ"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Localização</label>
          <div className="relative mt-1">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={editData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="Cidade, Estado"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Andares</label>
          <input
            type="number"
            min={0}
            value={editData.totalFloors}
            onChange={(e) => handleChange('totalFloors', parseInt(e.target.value) || 0)}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Subsolos</label>
          <input
            type="number"
            min={0}
            value={editData.basements}
            onChange={(e) => handleChange('basements', parseInt(e.target.value) || 0)}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div className="flex items-center gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editData.hasLeisure}
              onChange={(e) => handleChange('hasLeisure', e.target.checked)}
              className="w-4 h-4 rounded bg-white/5 border-white/10"
            />
            <span className="text-sm text-white">Área de Lazer</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editData.hasAtrium}
              onChange={(e) => handleChange('hasAtrium', e.target.checked)}
              className="w-4 h-4 rounded bg-white/5 border-white/10"
            />
            <span className="text-sm text-white">Átrio</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editData.technicalAreas > 0}
              onChange={(e) => handleChange('technicalAreas', e.target.checked ? 1 : 0)}
              className="w-4 h-4 rounded bg-white/5 border-white/10"
            />
            <span className="text-sm text-white">Área Técnica</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        {onDelete && (
          <button 
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
                onDelete();
              }
            }} 
            className="px-4 py-3 bg-rose-600/20 text-rose-500 rounded-xl font-bold hover:bg-rose-600/30 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Excluir
          </button>
        )}
        <div className="flex-1" />
        <button onClick={onClose} className="px-4 py-3 text-slate-500 font-bold">
          Cancelar
        </button>
        <button onClick={handleSave} className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500">
          Salvar
        </button>
      </div>

      {/* Lista de pavimentos */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-white">Pavimentos ({floors.length})</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {project.floors.map(floor => (
            <div 
              key={floor.id}
              className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">{floor.label}</span>
                <button
                  onClick={() => removeFloor(floor.id)}
                  className="p-1 text-slate-600 hover:text-rose-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="space-y-1">
                {floor.services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      const next = service.status === 'NOT_STARTED' ? 'IN_PROGRESS' 
                                 : service.status === 'IN_PROGRESS' ? 'COMPLETED'
                                 : 'NOT_STARTED';
                      updateFloorStatus(floor.id, service.name, next);
                    }}
                    className={cn(
                      "w-full text-[10px] py-1 rounded-lg transition-all text-left px-2",
                      service.status === 'COMPLETED' ? "bg-emerald-500/20 text-emerald-500" :
                      service.status === 'IN_PROGRESS' ? "bg-blue-500/20 text-blue-500" :
                      "bg-white/5 text-slate-500 hover:text-white"
                    )}
                  >
                    {service.name}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      getProgressForFloor(floor) === 100 ? "bg-emerald-500" : "bg-blue-600"
                    )}
                    style={{ width: `${getProgressForFloor(floor)}%` }}
                  />
                </div>
                <p className="text-[8px] text-slate-500 text-right mt-1">{getProgressForFloor(floor)}%</p>
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowFloorEdit(!showFloorEdit)}
            className="p-3 border border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-white hover:border-white/30 transition-all flex items-center justify-center"
          >
            <Plus size={20} />
          </button>
        </div>

        {showFloorEdit && (
          <div className="mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-xs text-slate-500 mb-3">Adicionar pavimento:</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { addFloor('BASEMENT'); setShowFloorEdit(false); }}
                className="px-3 py-2 bg-white/5 rounded-lg text-xs text-white hover:bg-white/10"
              >
                + Subsolo
              </button>
              <button
                onClick={() => { addFloor('GROUND'); setShowFloorEdit(false); }}
                className="px-3 py-2 bg-white/5 rounded-lg text-xs text-white hover:bg-white/10"
              >
                + Térreo
              </button>
              <button
                onClick={() => { addFloor('REGULAR'); setShowFloorEdit(false); }}
                className="px-3 py-2 bg-white/5 rounded-lg text-xs text-white hover:bg-white/10"
              >
                + Andar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}