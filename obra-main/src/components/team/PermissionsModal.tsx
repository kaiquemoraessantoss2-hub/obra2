'use client';

import { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import {
  TeamMember,
  AppModule,
  AccessLevel,
  ALL_MODULES,
  MODULE_LABELS,
} from '@/types/plans';

interface ObraOption {
  id: string;
  name: string;
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  obras: ObraOption[];
  onSave: (
    memberId: string,
    permissions: Record<AppModule, AccessLevel>,
    obrasAllowed: string[] | 'all'
  ) => void;
}

export default function PermissionsModal({
  isOpen,
  onClose,
  member,
  obras,
  onSave,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<Record<AppModule, AccessLevel>>(
    {} as Record<AppModule, AccessLevel>
  );
  const [obrasAllowed, setObrasAllowed] = useState<string[] | 'all'>('all');

  useEffect(() => {
    if (member) {
      setPermissions({ ...member.permissions });
      setObrasAllowed(member.obrasAllowed ?? 'all');
    }
  }, [member]);

  const handleSave = () => {
    if (member) {
      onSave(member.id, permissions, obrasAllowed);
      onClose();
    }
  };

  const isAllObras = obrasAllowed === 'all';

  const toggleAllObras = () => {
    setObrasAllowed(isAllObras ? [] : 'all');
  };

  const toggleObra = (id: string) => {
    if (obrasAllowed === 'all') return;
    if (obrasAllowed.includes(id)) {
      setObrasAllowed(obrasAllowed.filter((o) => o !== id));
    } else {
      setObrasAllowed([...obrasAllowed, id]);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-card p-8 rounded-[40px] max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">
            Permissões — {member.name}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Módulos */}
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Módulos
        </p>
        <table className="w-full mb-8">
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

        {/* Obras */}
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Acesso às Obras
        </p>
        <div className="space-y-2">
          {/* Toggle: todas as obras */}
          <button
            onClick={toggleAllObras}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 hover:border-blue-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-slate-400" />
              <span className="text-sm text-white font-medium">Todas as obras</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isAllObras ? 'border-blue-500 bg-blue-500' : 'border-white/20'
              }`}
            >
              {isAllObras && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>

          {/* Lista individual de obras */}
          {!isAllObras && (
            <div className="pl-4 space-y-1 border-l border-white/10 ml-2">
              {obras.length === 0 ? (
                <p className="text-sm text-slate-600 py-2">Nenhuma obra cadastrada.</p>
              ) : (
                obras.map((obra) => {
                  const checked =
                    Array.isArray(obrasAllowed) && obrasAllowed.includes(obra.id);
                  return (
                    <button
                      key={obra.id}
                      onClick={() => toggleObra(obra.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm text-slate-300">{obra.name}</span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          checked
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-white/20'
                        }`}
                      >
                        {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                    </button>
                  );
                })
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
