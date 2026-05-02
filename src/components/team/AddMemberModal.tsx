'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TeamMember, DEFAULT_PERMISSIONS } from '@/types/plans';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  companyId: string;
  onSuccess?: () => void;
}

async function createMemberInSupabase(
  name: string,
  email: string,
  password: string,
  ownerId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role: 'VIEWER', company_id: companyId },
    email_confirm: true,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Erro ao criar usuário' };
  }

  const { error: memberError } = await supabase.from('team_members').insert({
    id: data.user.id,
    owner_id: ownerId,
    company_id: companyId,
    name,
    email,
    permissions: DEFAULT_PERMISSIONS,
    is_active: true,
  });

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  return { success: true };
}

export default function AddMemberModal({ isOpen, onClose, ownerId, companyId, onSuccess }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const result = await createMemberInSupabase(name.trim(), email.trim().toLowerCase(), password, ownerId, companyId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Erro ao criar acesso');
      return;
    }
    setSuccess(`Acesso criado para ${name}`);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setSuccess('');
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-card p-8 rounded-[40px] max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white">Novo Acesso</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 mb-2">Nome completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="João Silva"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">Senha de acesso</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          <div>
            <label className="block text-sm text-slate-500 mb-2">Confirmar senha</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          {success && <div className="flex items-center gap-2 text-green-400"><Check size={18} /><span className="text-sm">{success}</span></div>}
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 text-slate-500 hover:text-white">Cancelar</button>
          <button onClick={handleSubmit} disabled={!!success || loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50">
            {loading ? 'Criando...' : 'Criar Acesso'}
          </button>
        </div>
      </div>
    </div>
  );
}
