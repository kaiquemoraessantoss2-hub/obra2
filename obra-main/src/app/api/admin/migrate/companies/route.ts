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

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS "Company" (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE,
      phone         TEXT,
      address       TEXT,
      plan          TEXT DEFAULT 'Básico',
      "monthlyValue" DECIMAL DEFAULT 0,
      "planStartDate" TIMESTAMP,
      "planEndDate" TIMESTAMP,
      "billingStatus" TEXT DEFAULT 'ACTIVE',
      "isPaused" BOOLEAN DEFAULT false,
      "activeUsers" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;

  const { error } = await adminClient.rpc('exec_sql', { sql: createTableSQL });

  if (error) {
    console.error('Erro ao criar tabela Company:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Tabela Company criada/verificada' });
}