'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import {
  TeamMember,
  AppModule,
  AccessLevel,
  ALL_MODULES,
  MODULE_LABELS,
} from '@/types/plans';

interface ProjectOption {
  id: string;
  name: string;
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  projects?: ProjectOption[];
  onSave: (
    memberId: string,
    permissions: Record<AppModule, AccessLevel>,
    projectIds: string[] | null
  ) => void;
}

export default function PermissionsModal({
  isOpen,
  onClose,
  member,
  projects = [],
  onSave,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<Record<AppModule, AccessLevel>>(
    {} as Record<AppModule, AccessLevel>
  );
  const [accessAllProjects, setAccessAllProjects] = useState(true);
  const [allowedProjectIds, setAllowedProjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (member) {
      setPermissions({ ...member.permissions });
      const restricted = Array.isArray(member.projectIds) && member.projectIds.length > 0;
      setAccessAllProjects(!restricted);
      setAllowedProjectIds(new Set(member.projectIds ?? []));
    }
  }, [member]);

  const toggleProject = (id: string) => {
    setAllowedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (member) {
      const projectIds = accessAllProjects ? null : Array.from(allowedProjectIds);
      onSave(member.id, permissions, projectIds);
      onClose();
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-card p-8 rounded-[40px] max-w-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">
            Permissões — {member.name}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase border-b border-white/10">
              <th className="text-left pb-3">Seção</th>
              <th className="text-center pb-3">Bloqueado</th>
              <th className="text-center pb-3">Ver</th>
              <th className="text-center pb-3">Editar</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODULES.map((module) => {
              const current = permissions[module];
              return (
                <tr key={module} className="border-b border-white/5">
                  <td className="py-3 text-white">{MODULE_LABELS[module]}</td>
                  {(['BLOQUEADO', 'VER', 'EDITAR'] as AccessLevel[]).map((level) => (
                    <td key={level} className="text-center py-3">
                      <button
                        onClick={() =>
                          setPermissions((prev) => ({ ...prev, [module]: level }))
                        }
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto ${
                          current === level
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-white/20 hover:border-white/40'
                        }`}
                      >
                        {current === level && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 pt-6 border-t border-white/10">
          <h4 className="text-sm font-black text-white mb-4">Acesso às Obras</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl cursor-pointer hover:bg-white/5">
              <input
                type="radio"
                name="projects-access"
                checked={accessAllProjects}
                onChange={() => setAccessAllProjects(true)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-white">Acessar todas as obras</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl cursor-pointer hover:bg-white/5">
              <input
                type="radio"
                name="projects-access"
                checked={!accessAllProjects}
                onChange={() => setAccessAllProjects(false)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-white">Restringir a obras específicas</span>
            </label>
          </div>

          {!accessAllProjects && (
            <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-1">
              {projects.length === 0 ? (
                <p className="text-xs text-slate-500 italic px-3">Nenhuma obra cadastrada ainda.</p>
              ) : (
                projects.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:border-white/20"
                  >
                    <input
                      type="checkbox"
                      checked={allowedProjectIds.has(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-white">{p.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-slate-500 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl"
          >
            Salvar Permissões
          </button>
        </div>
      </div>
    </div>
  );
}