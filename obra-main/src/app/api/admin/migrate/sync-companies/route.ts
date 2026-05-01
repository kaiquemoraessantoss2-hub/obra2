import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || serviceRoleKey === 'COLE_SUA_SERVICE_ROLE_KEY_AQUI') {
    return NextResponse.json({ error: 'Service role key não configurada' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: existing } = await adminClient
    .from('Company')
    .select('id')
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Company já tem dados', count: existing.length });
  }

  const { data: users } = await adminClient.auth.admin.listUsers();
  
  const companiesMap = new Map();
  
  users.users.forEach((u: any) => {
    const companyId = u.user_metadata?.companyId || `comp_${u.id}`;
    if (!companiesMap.has(companyId)) {
      companiesMap.set(companyId, {
        id: companyId,
        name: u.user_metadata?.full_name || u.email.split('@')[0],
        email: u.email,
        plan: u.user_metadata?.plan || 'Básico',
        monthlyValue: u.user_metadata?.plan === 'Pro' ? 499 : u.user_metadata?.plan === 'Empresa' ? 1200 : 199,
        planStartDate: new Date().toISOString(),
        planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billingStatus: 'ACTIVE',
        isPaused: false,
        activeUsers: 1,
        createdAt: u.created_at,
        updatedAt: new Date().toISOString()
      });
    } else {
      const existing = companiesMap.get(companyId);
      existing.activeUsers++;
    }
  });

  const companies = Array.from(companiesMap.values());
  
  if (companies.length === 0) {
    return NextResponse.json({ message: 'Nenhuma company encontrada', count: 0 });
  }

  const { error } = await adminClient
    .from('Company')
    .upsert(companies, { onConflict: 'id' });

  if (error) {
    console.error('Erro ao inserir companies:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    message: `${companies.length} companies migradas`,
    companies: companies.map((c: any) => c.id)
  });
}