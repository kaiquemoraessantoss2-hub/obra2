'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';

type AuthMode = 'company-login' | 'company-register' | 'member-login';

interface AuthProps {
  onLogin: (user: User, isNewUser?: boolean) => void;
  onMemberLogin?: () => void;
}

interface FloatingFieldProps {
  value: string;
  onChange: (v: string) => void;
  type: string;
  label: string;
  icon: React.ElementType;
  required?: boolean;
}

function FloatingField({ value, onChange, type, label, icon: Icon, required }: FloatingFieldProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div className="relative">
      <input
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent border-b-2 border-white/20 focus:border-blue-500 outline-none text-white py-3 pr-7 text-sm font-semibold transition-colors"
      />
      <label
        className={cn(
          'absolute left-0 transition-all duration-300 pointer-events-none',
          active
            ? '-top-3.5 text-[10px] font-black uppercase tracking-widest text-blue-400'
            : 'top-3 text-sm text-slate-500 font-normal'
        )}
      >
        {label}
      </label>
      <Icon
        className={cn('absolute right-0 top-3.5 transition-colors', active ? 'text-blue-500' : 'text-slate-600')}
        size={15}
      />
    </div>
  );
}

export default function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('company-login');
  const prevModeRef = useRef<AuthMode>('company-login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isMember = mode === 'member-login';
  const isRegister = mode === 'company-register';

  const shapeTransition = isMember !== (prevModeRef.current === 'member-login');
  const entryDelay = shapeTransition || isMember || prevModeRef.current === 'member-login' ? 1.5 : 0.15;

  const switchMode = (newMode: AuthMode) => {
    prevModeRef.current = mode;
    setMode(newMode);
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!isRegister) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError(authError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : authError.message);
          return;
        }
        if (data.user) {
          const { data: profile, error: profErr } = await supabase
            .from('profiles')
            .select('company_id, role, is_active, name')
            .eq('id', data.user.id)
            .maybeSingle();
          if (profErr || !profile) {
            setError('Perfil não encontrado. Contate o administrador.');
            return;
          }
          if (profile.is_active === false) {
            setError('Usuário bloqueado. Contate o administrador.');
            return;
          }
          if (!profile.company_id) {
            setError('Empresa não vinculada. Contate o administrador.');
            return;
          }
          onLogin({
            id: data.user.id,
            companyId: profile.company_id,
            name: profile.name || data.user.email || '',
            email: data.user.email || '',
            role: (profile.role || 'ADMIN') as User['role'],
            isActive: profile.is_active !== false,
          }, false);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role: email === 'admin@obraflow.com' ? 'SUPERADMIN' : 'ADMIN' } },
        });
        if (authError) { setError(authError.message); return; }
        if (data.user) {
          if (data.session === null) {
            setError('Conta criada! Verifique seu e-mail para confirmar.');
            return;
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role, is_active, name')
            .eq('id', data.user.id)
            .maybeSingle();
          if (!profile?.company_id) { setError('Erro ao criar perfil. Tente novamente.'); return; }
          onLogin({
            id: data.user.id,
            companyId: profile.company_id,
            name: profile.name || name,
            email,
            role: (profile.role || 'ADMIN') as User['role'],
            isActive: profile.is_active !== false,
          }, true);
        }
      }
    } catch (err) {
      setError(`Erro de conexão: ${err instanceof Error ? err.message : 'Falha na rede'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Preencha email e senha'); return; }
    setIsLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError || !data.user) {
      setIsLoading(false);
      setError('Email ou senha incorretos');
      return;
    }
    const { data: member } = await supabase
      .from('team_members').select('id').eq('id', data.user.id).maybeSingle();
    if (!member) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setError('Usuário sem acesso à equipe');
      return;
    }
    setIsLoading(false);
  };

  const fd = (i: number) => entryDelay + i * 0.08;

  const easing = [0.4, 0, 0.2, 1] as [number, number, number, number];

  const fv = (i: number, fromRight = false) => ({
    hidden: { opacity: 0, x: fromRight ? 24 : -24, filter: 'blur(6px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: fd(i), duration: 0.45, ease: easing } },
    exit: { opacity: 0, x: fromRight ? 24 : -24, filter: 'blur(6px)', transition: { delay: i * 0.04, duration: 0.25 } },
  });

  return (
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Ambient glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/[0.08] blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/[0.05] blur-[120px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="text-center mb-8 z-10 relative">
        <div className="inline-flex w-14 h-14 bg-blue-600 rounded-2xl items-center justify-center shadow-2xl shadow-blue-500/30 mb-3 animate-bounce-subtle">
          <Building2 className="text-white" size={28} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter">ObraFlow</h1>
        <p className="text-[#64748b] font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Gestão de Obras Premium</p>
      </div>

      {/* Auth card */}
      <motion.div
        className="relative w-full max-w-[820px] overflow-hidden z-10 hidden sm:block"
        style={{
          border: '1.5px solid rgba(37, 99, 235, 0.22)',
          boxShadow: '0 0 60px rgba(37, 99, 235, 0.10)',
          borderRadius: '20px',
        }}
        animate={{ height: isRegister ? 540 : 460 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        initial={{ height: 460 }}
      >
        {/* PRIMARY SHAPE — blue gradient, anchored bottom-right */}
        <motion.div
          className="absolute top-[-5px] pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, #050507, #1d4ed8)',
            right: 0,
            height: 600,
            width: 900,
            transformOrigin: 'bottom right',
          }}
          initial={{ rotate: 10, skewY: 40 }}
          animate={isMember ? { rotate: 0, skewY: 0 } : { rotate: 10, skewY: 40 }}
          transition={
            isMember
              ? { duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.5 }
              : { duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.8 }
          }
        />

        {/* SECONDARY SHAPE — dark overlay, rises from below to cover left in member mode */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            background: '#050507',
            borderTop: '2px solid rgba(37, 99, 235, 0.22)',
            left: 260,
            top: '100%',
            height: 700,
            width: 900,
            transformOrigin: 'bottom left',
          }}
          initial={{ rotate: 0, skewY: 0 }}
          animate={isMember ? { rotate: -11, skewY: -41 } : { rotate: 0, skewY: 0 }}
          transition={
            isMember
              ? { duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 1.2 }
              : { duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.5 }
          }
        />

        {/* LEFT PANEL */}
        <div className="absolute top-0 left-0 w-1/2 h-full flex flex-col justify-center px-10 z-10">
          <AnimatePresence mode="wait">
            {!isMember ? (
              <motion.form
                key={isRegister ? 'reg' : 'login'}
                onSubmit={handleCompanySubmit}
                className="flex flex-col gap-4 w-full"
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.h2 variants={fv(0)} className="text-[26px] font-black text-white mb-1">
                  {isRegister ? 'Criar Conta' : 'Entrar'}
                </motion.h2>

                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      initial={{ opacity: 0, x: -24, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: fd(1), duration: 0.45 } }}
                      exit={{ opacity: 0, x: -24, filter: 'blur(6px)', transition: { duration: 0.2 } }}
                    >
                      <FloatingField value={name} onChange={setName} type="text" label="Nome Completo" icon={UserIcon} required />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={fv(isRegister ? 2 : 1)}>
                  <FloatingField value={email} onChange={setEmail} type="email" label="Email" icon={Mail} required />
                </motion.div>

                <motion.div variants={fv(isRegister ? 3 : 2)}>
                  <FloatingField value={password} onChange={setPassword} type="password" label="Senha" icon={Lock} required />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                    >
                      <AlertCircle className="text-rose-500 shrink-0" size={14} />
                      <p className={cn('text-xs font-bold', error.includes('confirmar') ? 'text-blue-400' : 'text-rose-500')}>
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  variants={fv(isRegister ? 4 : 3)}
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-3 rounded-full border-2 border-blue-500 text-white font-black text-sm overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>{isRegister ? 'Criar Conta' : 'Entrar'} <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></>
                    }
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-b from-[#050507] via-blue-600 to-[#050507] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </motion.button>

                <motion.p variants={fv(isRegister ? 5 : 4)} className="text-center text-xs text-slate-500">
                  {isRegister
                    ? <>Já tem conta?{' '}<button type="button" onClick={() => switchMode('company-login')} className="text-blue-400 font-bold hover:underline">Entrar</button></>
                    : <>Sem conta?{' '}<button type="button" onClick={() => switchMode('company-register')} className="text-blue-400 font-bold hover:underline">Registrar</button></>
                  }
                </motion.p>
              </motion.form>
            ) : (
              <motion.div
                key="company-cta"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 1.7, duration: 0.5 } }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
                className="space-y-3"
              >
                <Building2 className="text-blue-500 mb-2" size={28} />
                <h2 className="text-2xl font-black text-white uppercase leading-snug">Acesso<br />Empresa</h2>
                <p className="text-[#64748b] text-sm leading-relaxed">Gestores e admins acessam por aqui.</p>
                <button
                  onClick={() => switchMode('company-login')}
                  className="text-blue-400 text-sm font-bold hover:underline flex items-center gap-1 mt-2"
                >
                  ← Entrar como empresa
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANEL */}
        <div className="absolute top-0 right-0 w-1/2 h-full flex flex-col justify-center px-10 z-10">
          <AnimatePresence mode="wait">
            {!isMember ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: entryDelay + 0.4, duration: 0.5 } }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.3 } }}
                className="text-right space-y-3"
              >
                <h2 className="text-2xl font-black text-white uppercase leading-snug">
                  {isRegister ? 'BEM-VINDO!' : <>BEM-VINDO<br />DE VOLTA!</>}
                </h2>
                <p className="text-[#64748b] text-sm leading-relaxed">
                  {isRegister
                    ? 'Crie sua conta e gerencie suas obras com eficiência.'
                    : 'Gerencie projetos, equipes e prazos em um só lugar.'}
                </p>
                <button
                  onClick={() => switchMode('member-login')}
                  className="text-blue-400 text-sm font-bold hover:underline flex items-center gap-1 ml-auto mt-2"
                >
                  Sou membro da obra →
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="member"
                onSubmit={handleMemberSubmit}
                className="flex flex-col gap-4 w-full"
              >
                <motion.div
                  className="flex items-center gap-2 mb-1"
                  initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 1.5, duration: 0.45 } }}
                >
                  <HardHat className="text-blue-500" size={22} />
                  <h2 className="text-[26px] font-black text-white">Membro</h2>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 1.6, duration: 0.45 } }}
                >
                  <FloatingField value={email} onChange={setEmail} type="email" label="Email" icon={Mail} required />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 1.7, duration: 0.45 } }}
                >
                  <FloatingField value={password} onChange={setPassword} type="password" label="Senha" icon={Lock} required />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                    >
                      <AlertCircle className="text-rose-500 shrink-0" size={14} />
                      <p className="text-xs font-bold text-rose-500">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 1.8, duration: 0.45 } }}
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-3 rounded-full border-2 border-blue-500 text-white font-black text-sm overflow-hidden group disabled:opacity-50 mt-1"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>Entrar como Membro <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></>
                    }
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-b from-[#050507] via-blue-600 to-[#050507] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* MOBILE FALLBACK — single panel, no shapes */}
      <div className="sm:hidden w-full max-w-sm space-y-5 animate-fade-in">
        <div
          className="glass-card p-8 rounded-[28px] relative overflow-hidden"
          style={{ boxShadow: '0 0 40px rgba(37, 99, 235, 0.10)' }}
        >
          {/* Mode tabs */}
          <div className="flex bg-white/[0.03] p-1 rounded-2xl mb-6 border border-white/5">
            <button
              onClick={() => switchMode('company-login')}
              className={cn('flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                !isMember ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-slate-300')}
            >
              Empresa
            </button>
            <button
              onClick={() => switchMode('member-login')}
              className={cn('flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                isMember ? 'bg-white text-black shadow-xl' : 'text-slate-500 hover:text-slate-300')}
            >
              Membro
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!isMember ? (
              <motion.form
                key={isRegister ? 'mob-reg' : 'mob-login'}
                onSubmit={handleCompanySubmit}
                className="flex flex-col gap-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <h2 className="text-xl font-black text-white">{isRegister ? 'Criar Conta' : 'Entrar'}</h2>

                {isRegister && (
                  <FloatingField value={name} onChange={setName} type="text" label="Nome Completo" icon={UserIcon} required />
                )}
                <FloatingField value={email} onChange={setEmail} type="email" label="Email" icon={Mail} required />
                <FloatingField value={password} onChange={setPassword} type="password" label="Senha" icon={Lock} required />

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <AlertCircle className="text-rose-500 shrink-0" size={14} />
                      <p className={cn('text-xs font-bold', error.includes('confirmar') ? 'text-blue-400' : 'text-rose-500')}>{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2">
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>{isRegister ? 'Criar Conta' : 'Entrar'} <ArrowRight size={15} /></>
                  }
                </button>

                <p className="text-center text-xs text-slate-500">
                  {isRegister
                    ? <>Já tem conta?{' '}<button type="button" onClick={() => switchMode('company-login')} className="text-blue-400 font-bold hover:underline">Entrar</button></>
                    : <>Sem conta?{' '}<button type="button" onClick={() => switchMode('company-register')} className="text-blue-400 font-bold hover:underline">Registrar</button></>
                  }
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="mob-member"
                onSubmit={handleMemberSubmit}
                className="flex flex-col gap-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center gap-2">
                  <HardHat className="text-blue-500" size={20} />
                  <h2 className="text-xl font-black text-white">Membro da Obra</h2>
                </div>
                <FloatingField value={email} onChange={setEmail} type="email" label="Email" icon={Mail} required />
                <FloatingField value={password} onChange={setPassword} type="password" label="Senha" icon={Lock} required />

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <AlertCircle className="text-rose-500 shrink-0" size={14} />
                      <p className="text-xs font-bold text-rose-500">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2">
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <>Entrar como Membro <ArrowRight size={15} /></>
                  }
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
