'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Settings, X, CheckCircle } from 'lucide-react';
import {
  TeamMember,
  PLAN_LIMITS,
  AppModule,
  AccessLevel,
  PlanType,
} from '@/types/plans';
import AddMemberModal from './AddMemberModal';
import PermissionsModal from './PermissionsModal';

const CREDENTIALS_KEY = 'member_credentials';

function getStorageKey(ownerId: string): string {
  return `owner_${ownerId}_team`;
}

function loadMembers(ownerId: string): TeamMember[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(getStorageKey(ownerId));
  return stored ? JSON.parse(stored) : [];
}

function saveMembers(members: TeamMember[], ownerId: string): void {
  localStorage.setItem(getStorageKey(ownerId), JSON.stringify(members));
}

function removeFromCredentials(email: string): void {
  const key = 'member_credentials';
  const existing = localStorage.getItem(key);
  if (!existing) return;
  const credentials = JSON.parse(existing);
  const filtered = credentials.filter((c: { email: string }) => c.email !== email);
  localStorage.setItem(key, JSON.stringify(filtered));
}

interface TeamPageProps {
  ownerId?: string;
  plan?: PlanType;
}

export default function TeamPage({ ownerId = 'default', plan = 'GOLD' }: TeamPageProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setMembers(loadMembers(ownerId));
  }, [ownerId]);

  const { maxMembers, label: planLabel } = PLAN_LIMITS[plan];
  const currentCount = members.length;
  const canAdd = currentCount < maxMembers;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAddMember = () => {
    setMembers(loadMembers(ownerId));
    setShowAddModal(false);
    showToast(`✅ Acesso criado`);
  };

  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    if (!confirm(`Remover ${member.name}?`)) return;
    
    const updated = members.filter(m => m.id !== memberId);
    saveMembers(updated, ownerId);
    removeFromCredentials(member.email);
    setMembers(updated);
    showToast(`Membro removido`);
  };

  const handleOpenPermModal = (member: TeamMember) => {
    setSelectedMember(member);
    setShowPermModal(true);
  };

  const handleSavePermissions = (memberId: string, permissions: Record<AppModule, AccessLevel>) => {
    const updated = members.map(m => 
      m.id === memberId ? { ...m, permissions } : m
    );
    saveMembers(updated, ownerId);
    setMembers(updated);
    showToast(`Permissões salvas`);
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 glass-card px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle size={18} className="text-green-400" />
          <span className="text-white text-sm">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card p-8 rounded-[40px]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Minha Equipe</h2>
            <p className="text-sm text-slate-500 mt-1">Gerencie os acessos dos membros</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-white">{planLabel}</p>
            <p className="text-sm text-slate-500">{currentCount} de {maxMembers} membros</p>
          </div>
        </div>
      </div>

      {/* Botão adicionar */}
      <button
        onClick={() => canAdd ? setShowAddModal(true) : undefined}
        disabled={!canAdd}
        className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
          canAdd 
            ? 'border-white/10 text-slate-500 hover:border-blue-500/50 hover:text-blue-400' 
            : 'border-white/5 text-slate-600 cursor-not-allowed'
        }`}
      >
        <Plus size={20} />
        {canAdd ? '+ Adicionar membro' : `Limite atingido (${maxMembers}). Upgrade para mais.`}
      </button>

      {/* Lista de membros */}
      <div className="space-y-3">
        {currentCount === 0 && (
          <div className="glass-card p-12 rounded-[40px] text-center">
            <Users size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">Nenhum membro ainda.</p>
            <p className="text-sm text-slate-600 mt-1">Clique acima para criar o primeiro acesso.</p>
          </div>
        )}
        
        {members.map(member => (
          <div key={member.id} className="glass-card p-6 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                <span className="font-black text-blue-400">{member.name[0].toUpperCase()}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{member.name}</span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-sm text-slate-500">{member.email}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleOpenPermModal(member)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-blue-400 rounded-xl transition-colors"
              >
                <Settings size={16} />
                Permissões
              </button>
              <button 
                onClick={() => handleRemoveMember(member.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de adicionar membro */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setMembers(loadMembers(ownerId));
        }}
        ownerId={ownerId}
        onSuccess={() => {
          setMembers(loadMembers(ownerId));
          showToast('Acesso criado');
        }}
      />

      {/* Modal de permissões */}
      <PermissionsModal
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        member={selectedMember}
        onSave={handleSavePermissions}
      />
    </div>
  );
}