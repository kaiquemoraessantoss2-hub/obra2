import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Wipe stale tokens so they don't cause repeated "Invalid Refresh Token" errors on load
if (typeof window !== 'undefined') {
  const clearStaleAuth = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
    keys.forEach(k => localStorage.removeItem(k));
  };

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      clearStaleAuth();
    }
  });

  // Sessão local pode estar com refresh_token inválido (usuário deletado, projeto
  // resetado, token expirado há muito tempo). Detecta e limpa automaticamente para
  // permitir um login novo sem precisar limpar manualmente o localStorage.
  supabase.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      clearStaleAuth();
    }
  }).catch(() => {
    clearStaleAuth();
  });
}
