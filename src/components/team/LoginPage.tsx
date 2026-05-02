'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LoginPageProps {
  onLogin: (member: { id: string; name: string; email: string; permissions: any }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Preencha email e senha');
      return;
    }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError || !data.user) {
      setError('Email ou senha incorretos');
      return;
    }

    const { data: member } = await supabase
      .from('team_members')
      .select('id, name, email, permissions')
      .eq('id', data.user.id)
      .single();

    if (!member) {
      setError('Usuário sem acesso à equipe');
      return;
    }

    onLogin(member);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-[40px] max-w-sm w-full space-y-6">
        <h2 className="text-2xl font-black text-white text-center">Entrar</h2>
        <div className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600" />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
