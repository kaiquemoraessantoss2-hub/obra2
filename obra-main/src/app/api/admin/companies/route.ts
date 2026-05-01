import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureTableExists(adminClient: any) {
  const { error } = await adminClient
    .from('Company')
    .select('id')
    .limit(1);
  
  if (error && error.code === '42P01') {
    console.log('Tabela Company não existe, criando...');
    const { error: createError } = await adminClient.rpc('create_companies_table', {});
    if (createError) {
      console.error('Erro ao criar tabela:', createError);
    }
  }
}

export async function GET() {
  if (!serviceRoleKey || serviceRoleKey === 'COLE_SUA_SERVICE_ROLE_KEY_AQUI') {
    return NextResponse.json({ error: 'Service role key não configurada' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  await ensureTableExists(adminClient);

  const { data, error } = await adminClient
    .from('Company')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ companies: [] });
    }
    console.error('Erro ao buscar companies:', error);
    return NextResponse.json({ companies: [] });
  }

  return NextResponse.json({ companies: data || [] });
}

export async function PUT(request: Request) {
  if (!serviceRoleKey || serviceRoleKey === 'COLE_SUA_SERVICE_ROLE_KEY_AQUI') {
    return NextResponse.json({ error: 'Service role key não configurada' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const body = await request.json();
  const { id, plan, monthlyValue, planStartDate, planEndDate, billingStatus, isPaused, name } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
  }

  const updateData: any = {};
  if (plan !== undefined) updateData.plan = plan;
  if (monthlyValue !== undefined) updateData.monthlyValue = monthlyValue;
  if (planStartDate !== undefined) updateData.planStartDate = planStartDate;
  if (planEndDate !== undefined) updateData.planEndDate = planEndDate;
  if (billingStatus !== undefined) updateData.billingStatus = billingStatus;
  if (isPaused !== undefined) updateData.isPaused = isPaused;
  if (name !== undefined) updateData.name = name;

  const { data, error } = await adminClient
    .from('Company')
    .upsert({ id, ...updateData, updatedAt: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ company: data });
}