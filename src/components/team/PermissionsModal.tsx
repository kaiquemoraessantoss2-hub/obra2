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

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSave: (memberId: string, permissions: Record<AppModule, AccessLevel>) => void;
}

export default function PermissionsModal({
  isOpen,
  onClose,
  member,
  onSave,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<Record<AppModule, AccessLevel>>(
    {} as Record<AppModule, AccessLevel>
  );

  useEffect(() => {
    if (member) {
      setPermissions({ ...member.permissions });
    }
  }, [member]);

  const handleSave = () => {
    if (member) {
      onSave(member.id, permissions);
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