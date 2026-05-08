# Plan B1 — Kanban de Medições + Branding da Empresa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar visualização Kanban à seção de medições com 4 estados (`lancada` → `em_analise` → `aprovada` → `paga`), e tela de cadastro de branding da empresa (logo, CNPJ, endereço, responsável técnico) que será usada no Plan B2 para gerar o Boletim PDF.

**Architecture:** Mesmo padrão validado no Plan A (Kanban de Pendências): migration adiciona `status` em medicoes; hook `useMedicoes` centraliza fetch/mutations/realtime; drag-and-drop via `@dnd-kit/core` com **transform direto no card** (sem `DragOverlay`); realtime com **nome de channel único por mount** (evita colisão do React 19 StrictMode). Branding ganha tabela `companies` estendida + bucket de Storage para logo + form em nova aba do `AdminSettings`.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Supabase JS + Supabase Storage + `@dnd-kit/core` (já instalado) + Tailwind

**Reference spec:** [`docs/superpowers/specs/2026-05-06-boletim-medicao-design.md`](../specs/2026-05-06-boletim-medicao-design.md) (seções 3 — migrations 1+2 — e 4 — componentes do Kanban; PDF e histórico ficam para Plan B2).

**Pre-requisite reading:** Antes de tocar em Server/Client Component, conferir convenções de Next.js 16 em `node_modules/next/dist/docs/` (esse projeto tem breaking changes vs. docs públicos antigos — `AGENTS.md`).

**Lessons learned do Plan A (não repetir):**
1. Channel realtime: nome único por mount com `crypto.randomUUID()` (StrictMode reusa channel já subscrito).
2. Drag-and-drop: `transform` direto no card, **NÃO usar `DragOverlay`** (causou double-movement no Kanban de Pendências).

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/migrations/014_medicoes_status.sql` | ADD status, aprovada_por, aprovada_em, paga_em em medicoes + índice |
| `supabase/migrations/015_companies_branding.sql` | ADD logo_url, cnpj, endereco, telefone, email_contato, responsavel_tecnico, responsavel_tecnico_crea, proximo_numero_boletim em companies |
| `supabase/storage_setup_empresa_logos.sql` | Cria bucket `empresa-logos` + policies RLS (script aplicado uma vez via MCP) |
| `src/hooks/useMedicoes.ts` | Fetch, CRUD, realtime, transições de status, parsing de form |
| `src/components/team/MedicaoKanbanCard.tsx` | Card draggable de medição (descrição, disciplina, valor, status) |
| `src/components/team/MedicaoColumn.tsx` | Coluna droppable do Kanban (4 colunas) |
| `src/components/team/MedicoesKanban.tsx` | Board orquestrando DndContext + colunas + criação de medição |
| `src/components/team/MedicaoObraSection.tsx` | **MODIFICAR**: usar hook, adicionar toggle Lista/Kanban |
| `src/components/EmpresaBrandingForm.tsx` | Formulário de branding da empresa (upload logo + campos) |
| `src/components/AdminSettings.tsx` | **MODIFICAR**: adicionar 4ª aba "Empresa" que renderiza o form |
| `src/lib/empresaBranding.ts` | Funções fetch/save da empresa branding (separado por reuso futuro no PDF do Plan B2) |

---

## Task 1: Migration `014_medicoes_status.sql`

**Files:**
- Create: `obra2-main/obra-main/supabase/migrations/014_medicoes_status.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- 014_medicoes_status.sql
-- Adiciona coluna `status` em medicoes para suportar Kanban com 4 estados:
-- lancada -> em_analise -> aprovada -> paga

ALTER TABLE medicoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'lancada'
  CHECK (status IN ('lancada','em_analise','aprovada','paga'));

ALTER TABLE medicoes ADD COLUMN IF NOT EXISTS aprovada_por text;
ALTER TABLE medicoes ADD COLUMN IF NOT EXISTS aprovada_em timestamptz;
ALTER TABLE medicoes ADD COLUMN IF NOT EXISTS paga_em timestamptz;

-- Índice para queries do Kanban (filtra por projeto + status)
CREATE INDEX IF NOT EXISTS idx_medicoes_project_status
  ON medicoes(project_id, status);
```

- [ ] **Step 2: Aplicar via MCP da Supabase**

Cole o conteúdo da migration no SQL Editor (ou rode via MCP). Sem `SELECT` no meio.

- [ ] **Step 3: Verificar (em execução separada)**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'medicoes' AND column_name IN ('status','aprovada_por','aprovada_em','paga_em');
```

Expected: 4 linhas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/014_medicoes_status.sql
git commit -m "feat(db): add status workflow columns to medicoes for kanban"
```

---

## Task 2: Migration `015_companies_branding.sql`

**Files:**
- Create: `obra2-main/obra-main/supabase/migrations/015_companies_branding.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- 015_companies_branding.sql
-- Adiciona campos de branding da empresa para uso no Boletim de Medição.
-- proximo_numero_boletim é incrementado a cada export (Plan B2).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_contato text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS responsavel_tecnico text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS responsavel_tecnico_crea text; -- opcional
ALTER TABLE companies ADD COLUMN IF NOT EXISTS proximo_numero_boletim integer NOT NULL DEFAULT 1;
```

- [ ] **Step 2: Aplicar via MCP**

Mesma rotina da Task 1.

- [ ] **Step 3: Verificar**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('logo_url','cnpj','endereco','telefone','email_contato',
                      'responsavel_tecnico','responsavel_tecnico_crea','proximo_numero_boletim');
```

Expected: 8 linhas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/015_companies_branding.sql
git commit -m "feat(db): add branding columns to companies for boletim de medicao"
```

---

## Task 3: Storage bucket `empresa-logos`

**Files:**
- Create: `obra2-main/obra-main/supabase/storage_setup_empresa_logos.sql`

Bucket público (logos vão pro PDF do boletim e podem ser cacheadas pela CDN). Upload restrito a usuários autenticados que pertencem à empresa dona do path.

- [ ] **Step 1: Escrever o script de setup**

```sql
-- storage_setup_empresa_logos.sql
-- Bucket público para logos das empresas. Path = {company_id}/logo.{ext}.
-- Aplicar uma vez via MCP / SQL Editor.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'empresa-logos',
  'empresa-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- SELECT é livre (bucket público)
DROP POLICY IF EXISTS "empresa_logos_select" ON storage.objects;
CREATE POLICY "empresa_logos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'empresa-logos');

-- INSERT/UPDATE/DELETE: usuário autenticado só pode mexer no folder da SUA empresa
DROP POLICY IF EXISTS "empresa_logos_insert_own_company" ON storage.objects;
CREATE POLICY "empresa_logos_insert_own_company" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "empresa_logos_update_own_company" ON storage.objects;
CREATE POLICY "empresa_logos_update_own_company" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "empresa_logos_delete_own_company" ON storage.objects;
CREATE POLICY "empresa_logos_delete_own_company" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'empresa-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM profiles WHERE id = auth.uid()
    )
  );
```

- [ ] **Step 2: Aplicar via MCP**

Coleo conteúdo no SQL Editor. Rodar uma vez só.

- [ ] **Step 3: Verificar**

```sql
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'empresa-logos';
```

Expected: 1 linha, `public=true`, `file_size_limit=2097152`.

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'empresa_logos%';
```

Expected: 4 policies.

- [ ] **Step 4: Commit**

```bash
git add supabase/storage_setup_empresa_logos.sql
git commit -m "feat(storage): create empresa-logos bucket with rls policies"
```

---

## Task 4: Lib `empresaBranding.ts`

**Files:**
- Create: `obra2-main/obra-main/src/lib/empresaBranding.ts`

Encapsula fetch/save da empresa. Vai ser reusada no Plan B2 (snapshot do branding no PDF).

- [ ] **Step 1: Criar lib**

```typescript
import { supabase } from './supabase';

export interface EmpresaBranding {
  id: string;
  name: string;
  logoUrl: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  emailContato: string | null;
  responsavelTecnico: string | null;
  responsavelTecnicoCrea: string | null;
}

interface RawCompany {
  id: string;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email_contato: string | null;
  responsavel_tecnico: string | null;
  responsavel_tecnico_crea: string | null;
}

function mapCompany(r: RawCompany): EmpresaBranding {
  return {
    id: r.id,
    name: r.name,
    logoUrl: r.logo_url,
    cnpj: r.cnpj,
    endereco: r.endereco,
    telefone: r.telefone,
    emailContato: r.email_contato,
    responsavelTecnico: r.responsavel_tecnico,
    responsavelTecnicoCrea: r.responsavel_tecnico_crea,
  };
}

export async function fetchEmpresaBranding(companyId: string): Promise<EmpresaBranding | null> {
  if (!companyId) return null;
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,logo_url,cnpj,endereco,telefone,email_contato,responsavel_tecnico,responsavel_tecnico_crea')
    .eq('id', companyId)
    .maybeSingle();
  if (error || !data) return null;
  return mapCompany(data as RawCompany);
}

export interface BrandingUpdate {
  cnpj: string;
  endereco: string;
  telefone: string;
  emailContato: string;
  responsavelTecnico: string;
  responsavelTecnicoCrea: string; // pode ser ''
  logoUrl: string | null;
}

export async function saveEmpresaBranding(
  companyId: string,
  payload: BrandingUpdate,
): Promise<{ ok: boolean; error?: string }> {
  if (!companyId) return { ok: false, error: 'company_id ausente' };
  const { error } = await supabase
    .from('companies')
    .update({
      cnpj: payload.cnpj || null,
      endereco: payload.endereco || null,
      telefone: payload.telefone || null,
      email_contato: payload.emailContato || null,
      responsavel_tecnico: payload.responsavelTecnico || null,
      responsavel_tecnico_crea: payload.responsavelTecnicoCrea || null,
      logo_url: payload.logoUrl,
    })
    .eq('id', companyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Faz upload do logo no bucket empresa-logos. Retorna URL pública. */
export async function uploadLogo(
  companyId: string,
  file: File,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!companyId) return { ok: false, error: 'company_id ausente' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Logo deve ter no máximo 2 MB.' };
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return { ok: false, error: 'Formato suportado: PNG, JPG, WEBP.' };
  }
  const path = `${companyId}/logo.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('empresa-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };
  const { data } = supabase.storage.from('empresa-logos').getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
```

- [ ] **Step 2: Verificar tsc**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/empresaBranding.ts
git commit -m "feat(branding): add empresaBranding lib with fetch/save/upload"
```

---

## Task 5: Hook `useMedicoes`

**Files:**
- Create: `obra2-main/obra-main/src/hooks/useMedicoes.ts`

Mesmo padrão do `usePendencias`, com transitions específicas (paga timestamps `paga_em`; aprovada timestamps `aprovada_em`+`aprovada_por`).

- [ ] **Step 1: Criar hook**

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';

export type MedicaoStatus = 'lancada' | 'em_analise' | 'aprovada' | 'paga';

export interface Medicao {
  id: string;
  projectId: string;
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  createdBy: string;
  status: MedicaoStatus;
  aprovadaPor?: string;
  aprovadaEm?: string;
  pagaEm?: string;
}

interface RawMedicao {
  id: string;
  project_id: string;
  disciplina: string;
  contratante: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  created_by: string | null;
  status?: MedicaoStatus | null;
  aprovada_por?: string | null;
  aprovada_em?: string | null;
  paga_em?: string | null;
}

function mapRow(r: RawMedicao): Medicao {
  return {
    id: r.id,
    projectId: r.project_id,
    disciplina: r.disciplina,
    contratante: r.contratante ?? '',
    descricao: r.descricao,
    quantidade: r.quantidade,
    unidade: r.unidade ?? '',
    valorUnitario: r.valor_unitario,
    valorTotal: r.valor_total,
    createdAt: r.created_at,
    createdBy: r.created_by ?? '',
    // Fallback: se migration 014 ainda não foi aplicada, derivar status como 'lancada'
    status: r.status ?? 'lancada',
    aprovadaPor: r.aprovada_por ?? undefined,
    aprovadaEm: r.aprovada_em ?? undefined,
    pagaEm: r.paga_em ?? undefined,
  };
}

export interface NovaMedicaoInput {
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
}

export function useMedicoes(projectId: string, currentUserName: string) {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Medicao[]>([]);
  ref.current = medicoes;

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('medicoes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setMedicoes((data ?? []).map(mapRow));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: nome único por mount evita colisão com cache de channels do supabase-js
  // quando React 19 StrictMode faz double-mount em dev (lição do Plan A).
  useEffect(() => {
    if (!projectId) return;
    const channelName = `medicoes:${projectId}:${
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medicoes', filter: `project_id=eq.${projectId}` },
        () => {
          refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, refetch]);

  const adicionar = useCallback(
    async (
      input: NovaMedicaoInput,
      initialStatus: MedicaoStatus = 'lancada',
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!input.disciplina || !input.descricao) {
        return { ok: false, error: 'Disciplina e descrição são obrigatórios.' };
      }
      if (Number.isNaN(input.quantidade) || Number.isNaN(input.valorUnitario)) {
        return { ok: false, error: 'Quantidade e valor unitário inválidos.' };
      }
      if (!projectId) return { ok: false, error: 'Selecione um projeto.' };
      const { data, error: insertError } = await supabase
        .from('medicoes')
        .insert({
          id: newId(),
          project_id: projectId,
          disciplina: input.disciplina,
          contratante: input.contratante,
          descricao: input.descricao,
          quantidade: input.quantidade,
          unidade: input.unidade,
          valor_unitario: input.valorUnitario,
          valor_total: input.quantidade * input.valorUnitario,
          created_by: currentUserName,
          status: initialStatus,
        })
        .select()
        .maybeSingle();
      if (insertError) return { ok: false, error: insertError.message };
      if (!data) return { ok: false, error: 'Sem permissão para criar medição.' };
      setMedicoes(prev => [...prev, mapRow(data as RawMedicao)]);
      return { ok: true };
    },
    [projectId, currentUserName],
  );

  const moverStatus = useCallback(
    async (id: string, novoStatus: MedicaoStatus): Promise<{ ok: boolean; error?: string }> => {
      const previous = ref.current;
      const target = previous.find(m => m.id === id);
      if (!target) return { ok: false, error: 'Medição não encontrada.' };
      if (target.status === novoStatus) return { ok: true };

      const nowIso = new Date().toISOString();

      // Update otimista
      setMedicoes(prev =>
        prev.map(m => {
          if (m.id !== id) return m;
          return {
            ...m,
            status: novoStatus,
            aprovadaPor: novoStatus === 'aprovada' || novoStatus === 'paga' ? (m.aprovadaPor ?? currentUserName) : m.aprovadaPor,
            aprovadaEm: novoStatus === 'aprovada' || novoStatus === 'paga' ? (m.aprovadaEm ?? nowIso) : m.aprovadaEm,
            pagaEm: novoStatus === 'paga' ? (m.pagaEm ?? nowIso) : (novoStatus === 'lancada' || novoStatus === 'em_analise' || novoStatus === 'aprovada' ? undefined : m.pagaEm),
          };
        }),
      );

      const updateBody: Record<string, unknown> = { status: novoStatus };
      if (novoStatus === 'aprovada' && !target.aprovadaEm) {
        updateBody.aprovada_por = currentUserName;
        updateBody.aprovada_em = nowIso;
      }
      if (novoStatus === 'paga' && !target.pagaEm) {
        updateBody.paga_em = nowIso;
        // Se aprovou direto, registra também
        if (!target.aprovadaEm) {
          updateBody.aprovada_por = currentUserName;
          updateBody.aprovada_em = nowIso;
        }
      }
      // Voltando atrás de paga, limpa paga_em
      if (target.status === 'paga' && novoStatus !== 'paga') {
        updateBody.paga_em = null;
      }

      const { error: updateError } = await supabase.from('medicoes').update(updateBody).eq('id', id);
      if (updateError) {
        setMedicoes(previous);
        return { ok: false, error: updateError.message };
      }
      return { ok: true };
    },
    [currentUserName],
  );

  const remover = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const previous = ref.current;
      setMedicoes(prev => prev.filter(m => m.id !== id));
      const { error: deleteError } = await supabase.from('medicoes').delete().eq('id', id);
      if (deleteError) {
        setMedicoes(previous);
        return { ok: false, error: deleteError.message };
      }
      return { ok: true };
    },
    [],
  );

  return { medicoes, loading, error, adicionar, moverStatus, remover, refetch };
}
```

- [ ] **Step 2: Verificar tsc**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMedicoes.ts
git commit -m "feat(medicoes): add useMedicoes hook with status transitions and realtime"
```

---

## Task 6: `MedicaoKanbanCard` (draggable)

**Files:**
- Create: `obra2-main/obra-main/src/components/team/MedicaoKanbanCard.tsx`

**Lição do Plan A:** transform direto no card, **NÃO** usar `DragOverlay`.

- [ ] **Step 1: Criar componente**

```typescript
'use client';

import { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, User, Tag } from 'lucide-react';
import { Medicao } from '@/hooks/useMedicoes';

interface MedicaoKanbanCardProps {
  medicao: Medicao;
  canEdit: boolean;
  onRemove: (id: string) => void;
}

const DISCIPLINA_COLORS: Record<string, string> = {
  'Elétrica': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Hidráulica': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Alvenaria': 'bg-stone-500/20 text-stone-300 border-stone-500/30',
  'Revestimento': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Pintura': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'Gás': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Dados': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Incêndio': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

export default function MedicaoKanbanCard({ medicao, canEdit, onRemove }: MedicaoKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: medicao.id,
    data: { medicao },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  const disciplinaClass = DISCIPLINA_COLORS[medicao.disciplina] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${disciplinaClass}`}>
          <Tag size={10} className="inline mr-1" /> {medicao.disciplina}
        </span>
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(medicao.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-500 hover:text-rose-500 shrink-0"
            aria-label="Remover medição"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="text-sm text-white break-words mb-2">{medicao.descricao}</p>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">
          {medicao.quantidade} {medicao.unidade} × R$ {medicao.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        <span className="text-emerald-400 font-bold">
          R$ {medicao.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
      {medicao.contratante && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
          <User size={10} /> {medicao.contratante}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tsc**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/MedicaoKanbanCard.tsx
git commit -m "feat(medicoes): add draggable MedicaoKanbanCard component"
```

---

## Task 7: `MedicaoColumn` (droppable)

**Files:**
- Create: `obra2-main/obra-main/src/components/team/MedicaoColumn.tsx`

Inclui o **total financeiro por coluna** no header (importante na UI de medições).

- [ ] **Step 1: Criar componente**

```typescript
'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Medicao, MedicaoStatus } from '@/hooks/useMedicoes';
import MedicaoKanbanCard from './MedicaoKanbanCard';

interface MedicaoColumnProps {
  status: MedicaoStatus;
  title: string;
  accentClass: string;
  medicoes: Medicao[];
  canEdit: boolean;
  onRemove: (id: string) => void;
  onCreateInColumn: (status: MedicaoStatus) => void;
}

export default function MedicaoColumn({
  status,
  title,
  accentClass,
  medicoes,
  canEdit,
  onRemove,
  onCreateInColumn,
}: MedicaoColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const totalColuna = medicoes.reduce((sum, m) => sum + m.valorTotal, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] bg-white/[0.02] rounded-2xl p-4 border-t-4 ${accentClass} ${
        isOver ? 'bg-white/[0.05]' : ''
      } transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {medicoes.length} item(ns) • R$ {totalColuna.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => onCreateInColumn(status)}
            className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5"
            aria-label={`Criar medição em ${title}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="space-y-2 min-h-[100px]">
        {medicoes.map(m => (
          <MedicaoKanbanCard
            key={m.id}
            medicao={m}
            canEdit={canEdit}
            onRemove={onRemove}
          />
        ))}
        {medicoes.length === 0 && (
          <div className="text-center py-6 text-[10px] text-slate-600 italic">
            arraste cards para cá
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tsc**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/MedicaoColumn.tsx
git commit -m "feat(medicoes): add droppable MedicaoColumn component"
```

---

## Task 8: `MedicoesKanban` (board)

**Files:**
- Create: `obra2-main/obra-main/src/components/team/MedicoesKanban.tsx`

**Lição do Plan A:** sem `DragOverlay`. Modal de criação reusa form da seção.

- [ ] **Step 1: Criar componente**

```typescript
'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useMedicoes, MedicaoStatus, Medicao } from '@/hooks/useMedicoes';
import MedicaoColumn from './MedicaoColumn';

const COLUMNS: Array<{ status: MedicaoStatus; title: string; accentClass: string }> = [
  { status: 'lancada', title: 'Lançada', accentClass: 'border-slate-500' },
  { status: 'em_analise', title: 'Em análise', accentClass: 'border-blue-500' },
  { status: 'aprovada', title: 'Aprovada', accentClass: 'border-emerald-500' },
  { status: 'paga', title: 'Paga', accentClass: 'border-violet-500' },
];

const DISCIPLINAS = ['Elétrica', 'Hidráulica', 'Alvenaria', 'Revestimento', 'Pintura', 'Gás', 'Dados', 'Incêndio'];

interface MedicoesKanbanProps {
  projectId: string;
  currentUserName: string;
  canEdit: boolean;
}

export default function MedicoesKanban({
  projectId,
  currentUserName,
  canEdit,
}: MedicoesKanbanProps) {
  const { medicoes, adicionar, moverStatus, remover } = useMedicoes(projectId, currentUserName);
  const [createInColumn, setCreateInColumn] = useState<MedicaoStatus | null>(null);
  const [form, setForm] = useState({
    disciplina: '',
    contratante: '',
    descricao: '',
    quantidade: '',
    unidade: '',
    valorUnitario: '',
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) return;
    const id = String(event.active.id);
    const newStatus = event.over.id as MedicaoStatus;
    const result = await moverStatus(id, newStatus);
    if (!result.ok && result.error) alert(`Erro ao mover: ${result.error}`);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta medição?')) return;
    const result = await remover(id);
    if (!result.ok && result.error) alert(`Erro ao remover: ${result.error}`);
  };

  const resetForm = () => {
    setForm({
      disciplina: '',
      contratante: '',
      descricao: '',
      quantidade: '',
      unidade: '',
      valorUnitario: '',
    });
  };

  const handleCreateSubmit = async () => {
    if (!createInColumn) return;
    const quantidade = parseFloat(form.quantidade.replace(',', '.'));
    const valorUnitario = parseFloat(form.valorUnitario.replace(',', '.'));
    const result = await adicionar(
      {
        disciplina: form.disciplina,
        contratante: form.contratante,
        descricao: form.descricao,
        quantidade,
        unidade: form.unidade,
        valorUnitario,
      },
      createInColumn,
    );
    if (!result.ok && result.error) {
      alert(`Erro: ${result.error}`);
      return;
    }
    resetForm();
    setCreateInColumn(null);
  };

  const medicoesByStatus = (status: MedicaoStatus): Medicao[] =>
    medicoes.filter(m => m.status === status);

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <MedicaoColumn
              key={col.status}
              status={col.status}
              title={col.title}
              accentClass={col.accentClass}
              medicoes={medicoesByStatus(col.status)}
              canEdit={canEdit}
              onRemove={handleRemove}
              onCreateInColumn={(s) => setCreateInColumn(s)}
            />
          ))}
        </div>
      </DndContext>

      {createInColumn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              <h3 className="text-lg font-bold text-white">
                Nova medição em &quot;{COLUMNS.find(c => c.status === createInColumn)?.title}&quot;
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={form.disciplina}
                onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <option value="">Disciplina</option>
                {DISCIPLINAS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="text"
                value={form.contratante}
                onChange={(e) => setForm({ ...form, contratante: e.target.value })}
                placeholder="Contratante"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descrição do serviço"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                placeholder="Quantidade"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <input
                type="text"
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                placeholder="Unidade (m, m², etc)"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <input
                type="text"
                value={form.valorUnitario}
                onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                placeholder="Valor Unitário (R$)"
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCreateInColumn(null);
                  resetForm();
                }}
                className="flex-1 py-2 text-slate-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSubmit}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verificar tsc**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/MedicoesKanban.tsx
git commit -m "feat(medicoes): add MedicoesKanban board with 4-column workflow"
```

---

## Task 9: Refatorar `MedicaoObraSection` com toggle Lista/Kanban

**Files:**
- Modify: `obra2-main/obra-main/src/components/team/MedicaoObraSection.tsx`

Adicionar toggle Lista/Kanban no topo, persistir no localStorage. Lista atual continua intacta. Lazy load do Kanban.

- [ ] **Step 1: Substituir TODO o conteúdo de `MedicaoObraSection.tsx`**

Conteúdo completo:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus, Download, Upload, Trash2, Filter, List, LayoutGrid,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';

// Lazy import do Kanban
const MedicoesKanban = dynamic(() => import('./MedicoesKanban'), {
  ssr: false,
  loading: () => <div className="text-center py-8 text-slate-500">Carregando Kanban...</div>,
});

const VIEW_STORAGE_KEY = 'medicoes_view_mode';
type ViewMode = 'list' | 'kanban';

interface Medicao {
  id: string;
  projectId: string;
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  createdBy: string;
}

const DISCIPLINAS = ['Elétrica', 'Hidráulica', 'Alvenaria', 'Revestimento', 'Pintura', 'Gás', 'Dados', 'Incêndio'];

async function fetchMedicoes(projectId: string): Promise<Medicao[]> {
  const { data, error } = await supabase
    .from('medicoes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    disciplina: r.disciplina,
    contratante: r.contratante ?? '',
    descricao: r.descricao,
    quantidade: r.quantidade,
    unidade: r.unidade ?? '',
    valorUnitario: r.valor_unitario,
    valorTotal: r.valor_total,
    createdAt: r.created_at,
    createdBy: r.created_by ?? '',
  }));
}

interface MedicaoFormData {
  disciplina: string;
  contratante: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
}

interface MedicaoObraSectionProps {
  projectId: string;
  currentUserName: string;
  canEdit?: boolean;
}

export default function MedicaoObraSection({
  projectId,
  currentUserName,
  canEdit = true,
}: MedicaoObraSectionProps) {
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDisciplina, setFilterDisciplina] = useState('');
  const [filterContratante, setFilterContratante] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<MedicaoFormData>({
    disciplina: '',
    contratante: '',
    descricao: '',
    quantidade: '',
    unidade: '',
    valorUnitario: '',
  });

  useEffect(() => {
    fetchMedicoes(projectId).then(setMedicoes);
  }, [projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === 'list' || saved === 'kanban') setViewMode(saved);
  }, []);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    }
  };

  const resetForm = () => {
    setForm({
      disciplina: '',
      contratante: '',
      descricao: '',
      quantidade: '',
      unidade: '',
      valorUnitario: '',
    });
  };

  const adicionarMedicao = async () => {
    if (!form.disciplina || !form.descricao || !form.quantidade || !form.valorUnitario) {
      alert('Preencha disciplina, descrição, quantidade e valor unitário.');
      return;
    }
    if (!projectId) {
      alert('Selecione um projeto antes de adicionar medições.');
      return;
    }
    const quantidade = parseFloat((form.quantidade || '').replace(',', '.'));
    const valorUnitario = parseFloat((form.valorUnitario || '').replace(',', '.'));
    if (Number.isNaN(quantidade) || Number.isNaN(valorUnitario)) {
      alert('Quantidade e valor unitário devem ser números válidos (use vírgula ou ponto).');
      return;
    }
    const { data, error } = await supabase.from('medicoes').insert({
      id: newId(),
      project_id: projectId,
      disciplina: form.disciplina,
      contratante: form.contratante,
      descricao: form.descricao,
      quantidade,
      unidade: form.unidade,
      valor_unitario: valorUnitario,
      valor_total: quantidade * valorUnitario,
      created_by: currentUserName,
    }).select().maybeSingle();
    if (error) {
      console.error('Erro ao adicionar medição:', error);
      alert(`Erro ao adicionar medição: ${error.message}`);
      return;
    }
    if (!data) {
      alert('Não foi possível salvar a medição. Verifique se você tem permissão neste projeto.');
      return;
    }
    setMedicoes(prev => [...prev, {
      id: data.id, projectId: data.project_id, disciplina: data.disciplina,
      contratante: data.contratante ?? '', descricao: data.descricao,
      quantidade: data.quantidade, unidade: data.unidade ?? '',
      valorUnitario: data.valor_unitario, valorTotal: data.valor_total,
      createdAt: data.created_at, createdBy: data.created_by ?? '',
    }]);
    resetForm();
    setShowAdd(false);
  };

  const removerMedicao = async (id: string) => {
    if (!confirm('Remover esta medição?')) return;
    await supabase.from('medicoes').delete().eq('id', id);
    setMedicoes(prev => prev.filter(m => m.id !== id));
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newMedicoes: Medicao[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',');
        if (cols.length >= 7) {
          const quantidade = parseFloat((cols[4] || '').replace(',', '.')) || 0;
          const valorUnitario = parseFloat((cols[6] || '').replace(',', '.')) || 0;

          newMedicoes.push({
            id: '',
            projectId,
            disciplina: cols[0].trim(),
            contratante: cols[1].trim(),
            descricao: cols[2].trim(),
            quantidade,
            unidade: cols[5].trim(),
            valorUnitario,
            valorTotal: quantidade * valorUnitario,
            createdAt: new Date().toISOString(),
            createdBy: currentUserName,
          });
        }
      }

      const inserts = newMedicoes.map(m => ({
        id: newId(),
        project_id: m.projectId,
        disciplina: m.disciplina,
        contratante: m.contratante,
        descricao: m.descricao,
        quantidade: m.quantidade,
        unidade: m.unidade,
        valor_unitario: m.valorUnitario,
        valor_total: m.valorTotal,
        created_by: m.createdBy,
      }));
      await supabase.from('medicoes').insert(inserts);
      const refreshed = await fetchMedicoes(projectId);
      setMedicoes(refreshed);
      alert(`${newMedicoes.length} medições importadas!`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadRelatorio = (disciplina?: string) => {
    let filtered = medicoes;
    if (disciplina) {
      filtered = medicoes.filter(m => m.disciplina === disciplina);
    }

    let csv = 'Disciplina,Contratante,Descrição,Quantidade,Unidade,Valor Unitário,Valor Total\n';
    let totalGeral = 0;

    filtered.forEach(m => {
      csv += `${m.disciplina},${m.contratante},${m.descricao},${m.quantidade},${m.unidade},${m.valorUnitario.toFixed(2)},${m.valorTotal.toFixed(2)}\n`;
      totalGeral += m.valorTotal;
    });

    csv += `\n,,,,,,TOTAL,${totalGeral.toFixed(2)}`;

    const disciplinaLabel = disciplina ? `_${disciplina}` : '_todos';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicoes${disciplinaLabel}.csv`;
    a.click();
  };

  const filteredMedicoes = medicoes.filter(m => {
    if (filterDisciplina && m.disciplina !== filterDisciplina) return false;
    if (filterContratante && m.contratante !== filterContratante) return false;
    return true;
  });

  const totalGeral = filteredMedicoes.reduce((acc, m) => acc + m.valorTotal, 0);
  const contratantes = [...new Set(medicoes.map(m => m.contratante))];

  return (
    <div className="glass-card p-8 rounded-[40px] space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Medições da Obra</h2>
          <p className="text-sm text-slate-500">
            {medicoes.length} item(ns) • Total: R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => switchView('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}
              aria-pressed={viewMode === 'list'}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => switchView('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
              }`}
              aria-pressed={viewMode === 'kanban'}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
          {viewMode === 'list' && (
            <>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-500 hover:text-white rounded-xl cursor-pointer"
              >
                <Upload size={18} /> Importar
              </label>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                  showFilters ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'
                }`}
              >
                <Filter size={18} /> Filtrar
              </button>
              {canEdit && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                  <Plus size={18} /> Novo
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <MedicoesKanban
          projectId={projectId}
          currentUserName={currentUserName}
          canEdit={canEdit}
        />
      ) : (
        <>
          {showFilters && (
            <div className="flex gap-4 p-4 bg-white/5 rounded-xl flex-wrap">
              <select
                value={filterDisciplina}
                onChange={(e) => setFilterDisciplina(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <option value="">Todas disciplinas</option>
                {DISCIPLINAS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={filterContratante}
                onChange={(e) => setFilterContratante(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                <option value="">Todos contratantes</option>
                {contratantes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => downloadRelatorio()}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-500 hover:text-white rounded-xl"
                >
                  <Download size={18} /> Todos
                </button>
                {filterDisciplina && (
                  <button
                    onClick={() => downloadRelatorio(filterDisciplina)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
                  >
                    <Download size={18} /> {filterDisciplina}
                  </button>
                )}
              </div>
            </div>
          )}

          {showAdd && (
            <div className="p-4 bg-white/5 rounded-xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={form.disciplina}
                  onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  <option value="">Disciplina</option>
                  {DISCIPLINAS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.contratante}
                  onChange={(e) => setForm({ ...form, contratante: e.target.value })}
                  placeholder="Contratante"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição do serviço"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  placeholder="Quantidade"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <input
                  type="text"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  placeholder="Unidade (m, m², etc)"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <input
                  type="text"
                  value={form.valorUnitario}
                  onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                  placeholder="Valor Unitário (R$)"
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2 text-slate-500 hover:text-white">
                  Cancelar
                </button>
                <button onClick={adicionarMedicao} className="flex-1 py-2 bg-blue-600 text-white rounded-xl">
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {filteredMedicoes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhuma medição ainda. Clique em &quot;Novo&quot; para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-white/10">
                    <th className="pb-3">Disciplina</th>
                    <th className="pb-3">Contratante</th>
                    <th className="pb-3">Descrição</th>
                    <th className="pb-3 text-right">Qtd</th>
                    <th className="pb-3 text-right">Valor Unit.</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicoes.map(m => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-3 text-white">{m.disciplina}</td>
                      <td className="py-3 text-slate-400">{m.contratante}</td>
                      <td className="py-3 text-slate-400">{m.descricao}</td>
                      <td className="py-3 text-right text-white">{m.quantidade} {m.unidade}</td>
                      <td className="py-3 text-right text-slate-400">R$ {m.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right text-green-400 font-bold">R$ {m.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => removerMedicao(m.id)} className="text-slate-500 hover:text-rose-500">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tsc + build**

```bash
./node_modules/.bin/tsc --noEmit && npm run build
```

Expected: build completa sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/MedicaoObraSection.tsx
git commit -m "feat(medicoes): add list/kanban toggle to MedicaoObraSection"
```

---

## Task 10: `EmpresaBrandingForm` (formulário de cadastro de branding)

**Files:**
- Create: `obra2-main/obra-main/src/components/EmpresaBrandingForm.tsx`

Form com upload de logo + campos. Preview do logo. Validação básica (CNPJ obrigatório, demais opcionais).

- [ ] **Step 1: Criar componente**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Building2, Upload, Save, AlertCircle, Check } from 'lucide-react';
import {
  fetchEmpresaBranding,
  saveEmpresaBranding,
  uploadLogo,
  EmpresaBranding,
} from '@/lib/empresaBranding';

interface EmpresaBrandingFormProps {
  companyId: string;
}

export default function EmpresaBrandingForm({ companyId }: EmpresaBrandingFormProps) {
  const [branding, setBranding] = useState<EmpresaBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    cnpj: '',
    endereco: '',
    telefone: '',
    emailContato: '',
    responsavelTecnico: '',
    responsavelTecnicoCrea: '',
    logoUrl: null as string | null,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEmpresaBranding(companyId).then(b => {
      if (cancelled) return;
      if (b) {
        setBranding(b);
        setForm({
          cnpj: b.cnpj ?? '',
          endereco: b.endereco ?? '',
          telefone: b.telefone ?? '',
          emailContato: b.emailContato ?? '',
          responsavelTecnico: b.responsavelTecnico ?? '',
          responsavelTecnicoCrea: b.responsavelTecnicoCrea ?? '',
          logoUrl: b.logoUrl,
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setFeedback(null);
    const result = await uploadLogo(companyId, file);
    setUploadingLogo(false);
    if (!result.ok) {
      setFeedback({ kind: 'err', msg: result.error || 'Erro ao enviar logo.' });
      return;
    }
    // Cache-bust para forçar reload da imagem
    const cacheBusted = `${result.url}?t=${Date.now()}`;
    setForm(prev => ({ ...prev, logoUrl: cacheBusted }));
    setFeedback({ kind: 'ok', msg: 'Logo carregado. Não esqueça de salvar para persistir os campos.' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.cnpj.trim()) {
      setFeedback({ kind: 'err', msg: 'CNPJ é obrigatório.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const result = await saveEmpresaBranding(companyId, form);
    setSaving(false);
    if (!result.ok) {
      setFeedback({ kind: 'err', msg: result.error || 'Erro ao salvar.' });
      return;
    }
    setFeedback({ kind: 'ok', msg: 'Identidade da empresa salva com sucesso.' });
  };

  if (loading) {
    return <div className="p-8 text-slate-500 text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 size={24} className="text-blue-500" />
        <div>
          <h3 className="text-xl font-black text-white">Identidade da Empresa</h3>
          <p className="text-xs text-slate-500">
            Esses dados aparecem no Boletim de Medição PDF. {branding?.name && `Empresa: ${branding.name}.`}
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
            feedback.kind === 'ok'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {feedback.kind === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo</label>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3">
            {form.logoUrl ? (
              <Image
                src={form.logoUrl}
                alt="Logo da empresa"
                width={120}
                height={120}
                className="rounded-xl object-contain bg-white/5 p-2"
                unoptimized
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-xl bg-white/5 flex items-center justify-center text-slate-600 text-[10px]">
                sem logo
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              ref={fileRef}
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
              disabled={uploadingLogo}
            />
            <label
              htmlFor="logo-upload"
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-xl cursor-pointer ${
                uploadingLogo ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              <Upload size={14} /> {uploadingLogo ? 'Enviando...' : 'Trocar logo'}
            </label>
            <p className="text-[10px] text-slate-600 text-center">PNG, JPG ou WEBP, máx. 2 MB.</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNPJ *</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, número — bairro, cidade/UF"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 0000-0000"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail de contato</label>
              <input
                type="email"
                value={form.emailContato}
                onChange={(e) => setForm({ ...form, emailContato: e.target.value })}
                placeholder="contato@empresa.com.br"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Responsável Técnico</label>
              <input
                type="text"
                value={form.responsavelTecnico}
                onChange={(e) => setForm({ ...form, responsavelTecnico: e.target.value })}
                placeholder="Nome do engenheiro responsável"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CREA (opcional)</label>
              <input
                type="text"
                value={form.responsavelTecnicoCrea}
                onChange={(e) => setForm({ ...form, responsavelTecnicoCrea: e.target.value })}
                placeholder="123456-D/SP"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold ${
              saving ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar identidade'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tsc**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Permitir o domínio do Supabase Storage no `next.config.ts`**

`next/image` precisa allowlist de domínios. Editar `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return '';
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
};

export default nextConfig;
```

Se `next.config.ts` já tem outras configs, mesclar mantendo o resto. Verificar conteúdo atual antes de sobrescrever.

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: build completa.

- [ ] **Step 5: Commit**

```bash
git add src/components/EmpresaBrandingForm.tsx next.config.ts
git commit -m "feat(branding): add EmpresaBrandingForm with logo upload and fields"
```

---

## Task 11: Integrar `EmpresaBrandingForm` em `AdminSettings` (4ª aba)

**Files:**
- Modify: `obra2-main/obra-main/src/components/AdminSettings.tsx`

Adiciona aba "Empresa" entre "Meu Perfil" e "Usuários" (ou no final, conforme layout). Renderiza `EmpresaBrandingForm` com `companyId` do `currentUser`.

- [ ] **Step 1: Ler arquivo atual completo antes de modificar**

```bash
cat src/components/AdminSettings.tsx
```

(Necessário porque o `Write` tool exige leitura prévia.)

- [ ] **Step 2: Modificar `AdminSettings.tsx`**

Mudanças pontuais (manter o resto idêntico):

1. Importar o form e ícone:
```typescript
import EmpresaBrandingForm from './EmpresaBrandingForm';
import { Building2 } from 'lucide-react'; // adicionar a esses já importados
```

2. Estender o tipo do `activeSection`:
```typescript
const [activeSection, setActiveSection] = useState<'profile' | 'users' | 'empresa' | 'settings'>('profile');
```

3. Adicionar botão de aba (depois de "Usuários", antes de "Configurações"):
```tsx
<button
  onClick={() => setActiveSection('empresa')}
  className={cn(
    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
    activeSection === 'empresa' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
  )}
>
  <Building2 size={14} />
  Empresa
</button>
```

4. Renderizar a seção (junto com os outros `activeSection === 'xxx' && (...)`):
```tsx
{activeSection === 'empresa' && (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
    {currentUser.companyId ? (
      <EmpresaBrandingForm companyId={currentUser.companyId} />
    ) : (
      <p className="text-sm text-slate-500">
        Esta conta não está vinculada a uma empresa. Branding indisponível.
      </p>
    )}
  </div>
)}
```

- [ ] **Step 3: Verificar tsc + build**

```bash
./node_modules/.bin/tsc --noEmit && npm run build
```

Expected: build completa.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminSettings.tsx
git commit -m "feat(branding): add Empresa tab to AdminSettings rendering branding form"
```

---

## Task 12: Smoke test manual

**Files:** (nenhum — verificação manual)

Mesmo padrão da Task 8 do Plan A. Sem framework de testes (decisão consciente; Vitest entra no Plan B2 onde lógica server-side justifica).

- [ ] **Step 1: `npm install` (Windows) e dev server**

```powershell
npm install
npm run dev
```

- [ ] **Step 2: Smoke do Kanban de Medições**

- [ ] Toggle Lista/Kanban aparece no header de "Medições da Obra".
- [ ] Em Kanban: 4 colunas (Lançada / Em análise / Aprovada / Paga) com total financeiro no header de cada coluna.
- [ ] Medições antigas aparecem em "Lançada" (fallback do mapper).
- [ ] Botão "+" no topo de uma coluna abre modal e cria medição **naquela coluna**.
- [ ] Drag de "Lançada" → "Em análise" persiste após reload.
- [ ] Drag para "Aprovada": no banco, `aprovada_por` e `aprovada_em` foram preenchidos.
- [ ] Drag para "Paga": `paga_em` preenchido (e `aprovada_*` se ainda não estavam).
- [ ] Voltando de "Paga" → "Aprovada": `paga_em` volta a NULL no banco.
- [ ] Card mostra disciplina como badge colorido, valor total em destaque.
- [ ] Botão de remover funciona sem disparar drag.
- [ ] Recarregar mantém Kanban (localStorage).
- [ ] Realtime: duas abas, mover card numa, segunda reflete em <2s.

- [ ] **Step 3: Smoke do Branding da Empresa**

- [ ] Aba "Empresa" aparece em Configurações.
- [ ] Form carrega vazio (primeira vez) ou com dados salvos.
- [ ] Upload de logo PNG <2MB funciona; preview atualiza imediatamente.
- [ ] Upload de arquivo >2MB rejeita com mensagem clara.
- [ ] Upload de PDF (formato inválido) rejeita.
- [ ] Salvar com CNPJ vazio → erro "CNPJ é obrigatório".
- [ ] Salvar com todos os campos preenchidos → toast de sucesso.
- [ ] Recarregar a página: dados persistiram.
- [ ] Sair e voltar como outro usuário da MESMA empresa: vê os mesmos dados.

- [ ] **Step 4: Verificação no banco**

```sql
SELECT id, name, logo_url IS NOT NULL AS tem_logo, cnpj, responsavel_tecnico
FROM companies WHERE id = '<sua_company_id>';
-- Esperado: tem_logo=true, cnpj preenchido, etc.

SELECT status, count(*) FROM medicoes GROUP BY status;
-- Esperado: distribuição entre lancada/em_analise/aprovada/paga conforme drags.

SELECT id, status, aprovada_por, aprovada_em, paga_em
FROM medicoes WHERE status IN ('aprovada','paga') LIMIT 5;
-- Esperado: timestamps coerentes.
```

- [ ] **Step 5: Verificar histórico de commits**

```bash
git log --oneline -15
```

Expected: 11 commits do plano (Tasks 1-11), em ordem cronológica.

---

## Self-Review Notes

**Spec coverage check (vs. seções da Spec B):**

- ✅ Migration 1 (status nas medicoes) — Task 1
- ✅ Migration 2 (branding companies) — Task 2
- ✅ Storage bucket empresa-logos — Task 3
- ✅ Hook useMedicoes — Task 5
- ✅ MedicaoCard / MedicaoColumn / MedicoesKanban — Tasks 6, 7, 8
- ✅ Toggle Lista/Kanban em MedicaoObraSection — Task 9
- ✅ EmpresaBrandingForm — Task 10
- ✅ Integração em AdminSettings — Task 11
- ⏭️ Migration 3 (boletim_exports) — **fica para Plan B2**
- ⏭️ Geração PDF (Puppeteer, template, /api/boletins) — **Plan B2**
- ⏭️ Histórico de boletins / re-download — **Plan B2**
- ⏭️ Numeração sequencial — **Plan B2** (campo `proximo_numero_boletim` já criado em Task 2)

**Placeholder scan:** nenhum TBD/TODO/"similar to". Todos os steps com código completo.

**Type consistency:**
- `MedicaoStatus` definido na Task 5, usado em 6/7/8.
- `Medicao` exportada de `useMedicoes`, usada nos componentes do Kanban.
- `EmpresaBranding` definido em `empresaBranding.ts` (Task 4), usado em Task 10.
- `BrandingUpdate` matches o shape do form em Task 10 (cnpj, endereco, etc., todos string + logoUrl: string|null).

**Risco residual:**
- `next.config.ts` em Task 10 step 3 assume que o arquivo só tem export default; se já tem outras configs (turbopack, env), engenheiro precisa mesclar manualmente em vez de copiar tal qual.
- Storage bucket policies dependem de `profiles.company_id` estar preenchido — se algum usuário tem `company_id=null`, upload falha. RLS já cobre isso, mas vale mensagem clara no form (já tem em Task 11 step 2.4: "conta não vinculada a empresa").
- Migration assume que tabela `companies` e coluna `name` existem (estão na 001).
