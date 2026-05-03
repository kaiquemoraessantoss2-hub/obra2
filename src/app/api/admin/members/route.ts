import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || serviceRoleKey === 'COLE_SUA_SERVICE_ROLE_KEY_AQUI' || !supabaseUrl) {
    throw new Error('Service role key não configurada');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyAdmin(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuração inválida');

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) throw new Error('Não autorizado');

  // Usamos um client com service role para verificar o admin de forma robusta,
  // ignorando eventuais problemas de RLS (como recursão) na tabela de profiles.
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) throw new Error('Não autorizado');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !['ADMIN', 'SUPERADMIN'].includes(profile.role)) {
    throw new Error('Sem permissão');
  }
}

function authErrorResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Erro';
  const status = msg === 'Sem permissão' ? 403 : 401;
  return NextResponse.json({ error: msg }, { status });
}

// POST /api/admin/members — cria novo membro
export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    const { name, email, password, ownerId, companyId } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'name, email e password são obrigatórios' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'VIEWER', company_id: companyId },
      email_confirm: true,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Erro ao criar usuário' }, { status: 500 });
    }

    const { error: memberError } = await adminClient.from('team_members').insert({
      id: data.user.id,
      owner_id: ownerId,
      company_id: companyId,
      name,
      email,
      permissions: {},
      is_active: true,
    });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/admin/members — remove membro pelo id
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdmin(request);
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'memberId é obrigatório' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.deleteUser(memberId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
