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
  const clearStaleAuth = async () => {
    // signOut local: zera tanto o estado em memória do cliente quanto o localStorage,
    // evitando que o auto-refresh continue tentando usar um refresh token quebrado.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
  };

  // Silencia o "Invalid Refresh Token: Refresh Token Not Found" que o supabase-js
  // loga quando o token persistido no browser foi revogado (usuário deletado, etc.).
  // O erro é tratado internamente pelo cliente — só queremos sumir com o ruído visual.
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    const msg = typeof first === 'string'
      ? first
      : first && typeof first === 'object' && 'message' in first
        ? String((first as { message: unknown }).message)
        : '';
    if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
      clearStaleAuth();
      return;
    }
    originalConsoleError(...args);
  };

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
    }
  });
}
