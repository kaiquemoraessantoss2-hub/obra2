'use client';

import { Plus, X } from 'lucide-react';
import { ModuleGuard } from '@/components/team';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { getProgressPercentage } from '@/lib/utils';
import { saveProjects } from '@/lib/auth';
import { Status } from '@/types';

export default function EngineeringTab() {
  const {
    project, projectDisciplines, allProjects, setAllProjects,
    showAddDiscipline, setShowAddDiscipline,
    newDisciplineName, setNewDisciplineName,
    handleAddDiscipline, handleRemoveDiscipline,
  } = useAppContext();

  return (
    <ModuleGuard module="PAVIMENTOS" access="VER">
      <div className="glass-card p-10 rounded-[40px] animate-fade-in overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Matriz Técnica de Execução</h2>
            <p className="text-sm text-slate-500">Controle de etapas e evolução por pavimento.</p>
          </div>
          <div className="flex items-center gap-3">
            {showAddDiscipline ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDisciplineName}
                  onChange={(e) => setNewDisciplineName(e.target.value)}
                  placeholder="Nome da disciplina"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                  autoFocus
                />
                <button onClick={handleAddDiscipline} className="p-2 bg-emerald-600 rounded-xl text-white hover:bg-emerald-500">
                  <Plus size={18} />
                </button>
                <button onClick={() => { setShowAddDiscipline(false); setNewDisciplineName(''); }} className="p-2 text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddDiscipline(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold"
              >
                <Plus size={16} />
                Adicionar Disciplina
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="pb-6 pl-4 w-48">Pavimento</th>
                <th className="pb-6 w-32">Progresso</th>
                {projectDisciplines.map(disc => (
                  <th key={disc} className="pb-6 px-4 min-w-[150px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>{disc}</span>
                      <button onClick={() => handleRemoveDiscipline(disc)} className="text-slate-600 hover:text-rose-500">
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(project?.floors || []).map(floor => {
                const floorProgress = getProgressPercentage(floor.services || []);
                return (
                  <tr key={floor.id} className="group transition-all">
                    <td className="py-4 pl-4 font-black text-sm text-slate-400 group-hover:text-white transition-colors">
                      {floor.label}
                    </td>
                    <td className="py-4 w-32">
                      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all duration-1000', floorProgress === 100 ? 'bg-emerald-500' : 'bg-blue-600')}
                          style={{ width: `${floorProgress}%` }}
                        />
                      </div>
                    </td>
                    {projectDisciplines.map(disc => {
                      const svc = floor.services.find(s => s.name === disc);
                      const status = svc?.status || 'NOT_STARTED';
                      return (
                        <td key={disc} className="py-4 px-2">
                          <button
                            onClick={() => {
                              const nextStatus: Status = status === 'NOT_STARTED' ? 'IN_PROGRESS' : status === 'IN_PROGRESS' ? 'COMPLETED' : 'NOT_STARTED';
                              if (project) {
                                const updatedProjects = allProjects.map(ap => ap.id === project.id ? {
                                  ...ap,
                                  floors: (ap.floors || []).map(f => {
                                    if (f.id !== floor.id) return f;
                                    const services = (f.services || []).map(s => s.name === disc ? { ...s, status: nextStatus } : s);
                                    return { ...f, services };
                                  }),
                                } : ap);
                                setAllProjects(updatedProjects);
                                saveProjects(updatedProjects);
                              }
                            }}
                            className={cn(
                              'w-full py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2',
                              status === 'COMPLETED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              status === 'IN_PROGRESS' ? 'bg-blue-600/10 border-blue-600/20 text-blue-500' :
                              'bg-white/[0.02] border-white/5 text-slate-600 hover:border-white/20 hover:text-slate-400',
                            )}
                          >
                            <div className={cn('w-1.5 h-1.5 rounded-full',
                              status === 'COMPLETED' ? 'bg-emerald-500' :
                              status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-700',
                            )} />
                            {status === 'COMPLETED' ? 'Finalizado' : status === 'IN_PROGRESS' ? 'Em Obra' : 'Pendente'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleGuard>
  );
}
