'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginPageProps {
  onBack?: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
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

    if (authError || !data.user) {
      setLoading(false);
      setError('Email ou senha incorretos');
      return;
    }

    // Garante que só team_members entrem por essa tela.
    const { data: member } = await supabase
      .from('team_members')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!member) {
      await supabase.auth.signOut();
      setLoading(false);
      setError('Usuário sem acesso à equipe');
      return;
    }

    // O listener em page.tsx detecta team_member e seta currentMember automaticamente.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-[40px] max-w-sm w-full space-y-6 relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center gap-1 text-sm text-slate-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}
        <h2 className="text-2xl font-black text-white text-center pt-6">Entrar como membro</h2>
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
