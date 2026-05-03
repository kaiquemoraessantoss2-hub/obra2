'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Users, Shield, Settings, Key, Plus, X, Check, Eye, EyeOff, AlertCircle, Trash2, Edit, Save, Database } from 'lucide-react';
import { User as UserType } from '@/types';
import { cn } from '@/lib/utils';
import { loadUserProfilesFromSupabase } from '@/lib/auth';
import MigrationTool from './MigrationTool';

interface Props {
  currentUser: UserType;
  onUpdateUser: (user: UserType) => void;
}

export default function AdminSettings({ currentUser, onUpdateUser }: Props) {
  const [activeSection, setActiveSection] = useState<'profile' | 'users' | 'settings'>('profile');
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await loadUserProfilesFromSupabase();
      const mapped: UserType[] = data.map((u) => ({
        id: u.id as string,
        email: u.email as string,
        name: (u.name as string) || (u.email as string),
        role: (u.role as UserType['role']) || 'ADMIN',
        companyId: (u.companyId as string) || '',
      }));
      setUsers(mapped);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsers();
    }
  }, [activeSection, fetchUsers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSection('profile')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'profile' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
            )}
          >
            <User size={14} />
            Meu Perfil
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'users' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
            )}
          >
            <Users size={14} />
            Usuários
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'settings' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
            )}
          >
            <Settings size={14} />
            Configurações
          </button>
        </div>
      </div>

      {activeSection === 'profile' && (
        <ProfileSection user={currentUser} onUpdate={onUpdateUser} />
      )}

{activeSection === 'users' && (
          <UsersSection
            users={users}
            loading={loadingUsers}
            onAdd={() => {
              fetchUsers();
            }}
            onDelete={() => {
              fetchUsers();
            }}
          />
        )}

      {activeSection === 'settings' && (
        <div className="space-y-6">
          <SystemSettings />
          <MigrationTool />
        </div>
      )}
    </div>
  );
}

function ProfileSection({ user, onUpdate }: { user: UserType; onUpdate: (user: UserType) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const passwordStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const handleSave = () => {
    onUpdate({ ...user, name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('As senhas não conferem!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Senha deve ter pelo menos 6 caracteres!');
      return;
    }
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        alert(`Erro ao alterar senha: ${error.message}`);
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Erro ao salvar senha!');
    }
  };

  return (
    <div className="glass-card p-8 rounded-[40px] border border-white/5 space-y-8">
      <h2 className="text-xl font-black text-white">Meu Perfil</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Cargo</label>
          <div className="mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400">
            {user.role === 'SUPERADMIN' ? 'Administrador' : user.role === 'ENGINEER' ? 'Engenheiro' : user.role === 'ADMIN' ? 'Gestor' : 'Visualizador'}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Empresa</label>
          <div className="mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400">
            {user.companyId}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 flex items-center gap-2"
      >
        {saved ? <Check size={18} /> : <Save size={18} />}
        {saved ? 'Salvo!' : 'Salvar Dados'}
      </button>

      <div className="pt-6 border-t border-white/5">
        <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
          <Key size={18} />
          Alterar Senha
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Senha Atual</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Nova Senha</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="••••••••"
            />
            <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  passwordStrength(newPassword) === 0 ? 'bg-transparent' :
                  passwordStrength(newPassword) <= 25 ? 'bg-rose-500' :
                  passwordStrength(newPassword) <= 50 ? 'bg-amber-500' :
                  passwordStrength(newPassword) <= 75 ? 'bg-blue-500' :
                  'bg-emerald-500'
                )}
                style={{ width: `${passwordStrength(newPassword)}%` }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase">Confirmar Senha</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="••••••••"
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-rose-500 mt-1">Senhas não conferem!</p>
            )}
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className="mt-4 px-6 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Alterar Senha
        </button>

        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-bold mb-1">Dicas de senha segura:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Mínimo 8 caracteres</li>
                <li>Letras maiúsculas e minúsculas</li>
                <li>Números</li>
                <li>Símbolos especiais (!@#$%&*)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersSection({ users, loading, onAdd, onDelete }: { users: UserType[]; loading: boolean; onAdd: () => void; onDelete: (userId: string) => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    role: UserType['role'];
    companyId: string;
    password: string;
  }>({
    name: '',
    email: '',
    role: 'ENGINEER',
    companyId: '',
    password: ''
  });

  const handleAdd = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert('Preencha todos os campos!');
      return;
    }
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role,
            company_id: newUser.companyId || `comp_${Date.now()}`,
          }
        }
      });
      if (error) { alert(`Erro: ${error.message}`); return; }
      
      // O trigger 'on_auth_user_created' no Supabase criará automaticamente 
      // o registro na tabela 'profiles' usando os metadados acima.
      
      onAdd();
      setNewUser({ name: '', email: '', role: 'ENGINEER', companyId: '', password: '' });
      setShowAddForm(false);
      alert('Usuário criado com sucesso! Ele precisará confirmar o e-mail se a confirmação estiver ativa no Supabase.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      alert(`Erro: ${errorMessage}`);
    }
  };

  return (
    <div className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">Gerenciar Usuários</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 rounded-xl text-white text-xs font-bold flex items-center gap-2"
        >
          <Plus size={14} />
          Novo Usuário
        </button>
      </div>

      {showAddForm && (
        <div className="p-6 bg-white/[0.02] border border-blue-600/30 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold text-blue-500">Novo Usuário</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="Nome completo"
            />
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="E-mail"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as UserType['role'] }))}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
            >
              <option value="ENGINEER">Engenheiro</option>
              <option value="ADMIN">Gestor</option>
              <option value="VIEWER">Visualizador</option>
            </select>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              placeholder="Senha temporária"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 rounded-xl text-white text-sm font-bold"
            >
              Criar Usuário
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin mr-3" />
          Carregando usuários...
        </div>
      )}

      <div className="space-y-3">
        {!loading && users.map(user => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center font-bold text-blue-500">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold",
                user.role === 'SUPERADMIN' ? 'bg-purple-500/20 text-purple-500' :
                user.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-500' :
                user.role === 'ENGINEER' ? 'bg-blue-500/20 text-blue-500' :
                'bg-slate-500/20 text-slate-500'
              )}>
                {user.role === 'SUPERADMIN' ? 'Admin' : user.role === 'ENGINEER' ? 'Engenheiro' : user.role === 'ADMIN' ? 'Gestor' : 'Visualizador'}
              </span>
              
              <button
                onClick={() => onDelete(user.id)}
                className="p-2 text-slate-500 hover:text-rose-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemSettings() {
  const [settings, setSettings] = useState({
    siteName: 'ObraFlow',
    allowRegister: true,
    requireApproval: true,
    maxProjectsPerCompany: 10,
  });

  return (
    <div className="glass-card p-8 rounded-[40px] border border-white/5 space-y-6">
      <h2 className="text-xl font-black text-white">Configurações do Sistema</h2>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Nome do Sistema</label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div>
            <p className="text-sm font-bold text-white">Permitir Cadastro</p>
            <p className="text-xs text-slate-500">Novos usuários podem se registrar</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, allowRegister: !prev.allowRegister }))}
            className={cn(
              "w-12 h-6 rounded-full transition-all",
              settings.allowRegister ? "bg-blue-600" : "bg-slate-700"
            )}
          >
            <div className={cn(
              "w-5 h-5 bg-white rounded-full transition-transform",
              settings.allowRegister ? "translate-x-6" : "translate-x-0.5"
            )} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div>
            <p className="text-sm font-bold text-white">Aprovação de Usuários</p>
            <p className="text-xs text-slate-500">Novos usuários precisam de aprovação</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, requireApproval: !prev.requireApproval }))}
            className={cn(
              "w-12 h-6 rounded-full transition-all",
              settings.requireApproval ? "bg-blue-600" : "bg-slate-700"
            )}
          >
            <div className={cn(
              "w-5 h-5 bg-white rounded-full transition-transform",
              settings.requireApproval ? "translate-x-6" : "translate-x-0.5"
            )} />
          </button>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-600 uppercase">Máximo de Projetos por Empresa</label>
          <input
            type="number"
            min={1}
            max={100}
            value={settings.maxProjectsPerCompany}
            onChange={(e) => setSettings(prev => ({ ...prev, maxProjectsPerCompany: parseInt(e.target.value) }))}
            className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>
      </div>

      <button className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500">
        Salvar Configurações
      </button>
    </div>
  );
}