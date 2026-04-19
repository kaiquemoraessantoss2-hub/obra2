import { createClient } from '@supabase/supabase-js';

// TESTE TEMPORÁRIO COM CHAVES DIRETAS
const supabaseUrl = 'https://lxwbzshvnqwbypoflccz.supabase.co';
const supabaseAnonKey = 'sb_publishable_eGpDdgB15CY7WugD7We_mg_fl24CSXG';

console.log('🔌 Tentando conexão direta com Supabase:', supabaseUrl);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
