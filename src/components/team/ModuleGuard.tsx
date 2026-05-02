'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { AppModule, AccessLevel, PlanType } from '@/types/plans';

interface ModuleGuardProps {
  module: AppModule;
  access: 'VER' | 'EDITAR';
  memberPermissions?: Record<AppModule, AccessLevel>;
  plan?: PlanType;
  children: React.ReactNode;
}

export default function ModuleGuard({ 
  module, 
  access, 
  memberPermissions,
  children 
}: ModuleGuardProps) {
  // Se não tem memberPermissions, assume que é o dono - acesso total
  if (!memberPermissions) {
    return <>{children}</>;
  }

  const hasAccess = memberPermissions[module] === access || memberPermissions[module] === 'EDITAR';

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="glass-card p-12 rounded-[40px] border border-white/5 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <Lock size={32} className="text-slate-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white mb-2">Acesso Bloqueado</h3>
          <p className="text-sm text-slate-500">Você não tem acesso a este módulo.</p>
          <p className="text-sm text-slate-600 mt-1">Fale com o responsável da obra.</p>
        </div>
      </div>
    </div>
  );
}