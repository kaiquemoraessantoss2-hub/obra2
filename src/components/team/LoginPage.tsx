'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, LogIn } from 'lucide-react';
import { TeamMember, AppModule, AccessLevel } from '@/types/plans';

const CREDENTIALS_KEY = 'member_credentials';

interface LoginPageProps {
  onLogin: (member: TeamMember) => void;
  onClose?: () => void;
}

function verifyCredentials(email: string, password: string): TeamMember | null {
  const credKey = CREDENTIALS_KEY;
  const credStored = localStorage.getItem(credKey);
  if (!credStored) return null;

  const credentials: { email: string; hashedPassword: string; ownerId: string }[] = JSON.parse(credStored);
  const cred = credentials.find(c => c.email === email.toLowerCase());
  if (!cred) return null;

  const hashedInput = btoa(password);
  if (hashedInput !== cred.hashedPassword) return null;

  const teamKey = `owner_${cred.ownerId}_team`;
  const teamStored = localStorage.getItem(teamKey);
  if (!teamStored) return null;

  const members: TeamMember[] = JSON.parse(teamStored);
  const member = members.find(m => m.email === email.toLowerCase());
  return member || null;
}

export default function LoginPage({ onLogin, onClose }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Preencha todos os campos');
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const credKey = CREDENTIALS_KEY;
    const credStored = localStorage.getItem(credKey);
    
    if (!credStored) {
      setError('Nenhuma credencial encontrada');
      return;
    }

    const credentials: { email: string; hashedPassword: string; ownerId: string }[] = JSON.parse(credStored);
    const cred = credentials.find(c => c.email === emailLower);
    
    if (!cred) {
      setError('Email não encontrado');
      return;
    }

    const hashedInput = btoa(password);
    
    if (hashedInput !== cred.hashedPassword) {
      setError('Senha incorreta');
      return;
    }

    const teamKey = `owner_${cred.ownerId}_team`;
    const teamStored = localStorage.getItem(teamKey);
    
    if (!teamStored) {
      setError('Membro não encontrado');
      return;
    }

    const members: TeamMember[] = JSON.parse(teamStored);
    const member = members.find(m => m.email === emailLower);
    
    if (!member) {
      setError('Membro não encontrado');
      return;
    }

    // Salvar no sessionStorage em vez de URL
    sessionStorage.setItem('current_member', JSON.stringify(member));
    onLogin(member);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="glass-card p-10 rounded-[40px] max-w-md w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white">Login de Membro</h2>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={24} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-slate-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@criar.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-500 mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            Entrar
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          Acesso criado pelo responsável da obra
        </p>
      </div>
    </div>
  );
}