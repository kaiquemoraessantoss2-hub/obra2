'use client';

import { FileText, Plus, Building2 } from 'lucide-react';
import { ConstructionPhase, Status } from '@/types';

interface EmptyPhaseStateProps {
  onUseTemplate: (phases: ConstructionPhase[]) => void;
  onAddManually: () => void;
}

export default function EmptyPhaseState({ onUseTemplate, onAddManually }: EmptyPhaseStateProps) {
  const handleUseTemplate = () => {
    const clonedPhases = getTemplatePhases();
    onUseTemplate(clonedPhases);
  };

  return (
    <div className="glass-card p-8 rounded-[40px] border border-white/5 text-center">
      <Building2 className="text-blue-500 mx-auto mb-4" size={48} />
      
      <h3 className="text-xl font-black text-white mb-2">Obra criada com sucesso!</h3>
      <p className="text-slate-500 mb-6">Nenhuma fase cadastrada ainda. Como deseja começar?</p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={handleUseTemplate}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
        >
          <FileText size={18} />
          Usar template de fases
        </button>
        <button 
          onClick={onAddManually}
          className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-6 rounded-xl transition-all"
        >
          <Plus size={18} />
          Adicionar fases manualmente
        </button>
      </div>
    </div>
  );
}

export function getTemplatePhases(): ConstructionPhase[] {
  const now = Date.now();
  const template: ConstructionPhase[] = [
    { id: `p_${now}_1`, name: 'PRÉ-OBRA', icon: 'FileText', color: 'bg-blue-500', progress: 0, status: 'NOT_STARTED', weight: 5, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_1`, name: 'Projeto Executivo', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_2`, name: 'Aprovação', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_3`, name: 'Licenciamento', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_2`, name: 'FUNDAÇÃO', icon: 'Building', color: 'bg-amber-500', progress: 0, status: 'NOT_STARTED', weight: 10, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_4`, name: 'Escavação', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_5`, name: 'Fundação', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_6`, name: 'Impermeabilização', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_3`, name: 'ESTRUTURA', icon: 'Building', color: 'bg-emerald-500', progress: 0, status: 'NOT_STARTED', weight: 20, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_7`, name: 'Pilares', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_8`, name: 'Lajes', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_9`, name: 'Escada/Rampa', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_4`, name: 'ALVENARIA', icon: 'Box', color: 'bg-orange-500', progress: 0, status: 'NOT_STARTED', weight: 15, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_10`, name: 'Alvenaria de Tijolo', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_11`, name: 'Alvenaria de Bloco', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_5`, name: 'INSTALAÇÕES', icon: 'Zap', color: 'bg-cyan-500', progress: 0, status: 'NOT_STARTED', weight: 10, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_12`, name: 'Elétrica', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_13`, name: 'Hidráulica', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_14`, name: 'SPDA', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_6`, name: 'ESQUADRIAS', icon: 'Layers', color: 'bg-indigo-500', progress: 0, status: 'NOT_STARTED', weight: 8, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_15`, name: 'Janelas', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_16`, name: 'Portas', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_7`, name: 'REVESTIMENTO', icon: 'Droplets', color: 'bg-rose-500', progress: 0, status: 'NOT_STARTED', weight: 15, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_17`, name: 'Argamassa', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_18`, name: 'Piso', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_19`, name: 'Parede', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_8`, name: 'PINTURA', icon: 'CheckCircle', color: 'bg-teal-500', progress: 0, status: 'NOT_STARTED', weight: 5, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_20`, name: 'Primer', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_21`, name: 'Tinta', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
    { id: `p_${now}_9`, name: 'COMPLEMENTOS', icon: 'Users', color: 'bg-violet-500', progress: 0, status: 'NOT_STARTED', weight: 2, startDate: '', endDate: '', responsible: '', observations: '', subSteps: [
      { id: `s_${now}_22`, name: 'Limpeza Final', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
      { id: `s_${now}_23`, name: 'Entrega', progress: 0, status: 'NOT_STARTED', observations: '', responsible: '', hasFloorBreakdown: false, floorExecutions: [] },
    ]},
  ];
  
  return template;
}