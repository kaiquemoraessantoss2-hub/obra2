# Kanban de Pendências — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar visualização Kanban à seção de pendências, com 4 estados (`a_fazer` → `em_andamento` → `aguardando_aprovacao` → `concluida`), preservando a lista atual como visualização alternativa e mantendo compatibilidade total com o campo `concluida` legado.

**Architecture:** Migration adiciona coluna `status` em `pendencias` com trigger que sincroniza com `concluida` legada. Hook `usePendencias` centraliza fetch/mutations/realtime; consumido tanto pela lista existente quanto pelo novo board. Drag-and-drop via `@dnd-kit/core`. Updates otimistas com rollback em erro.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Supabase JS + `@dnd-kit/core` + Tailwind CSS

**Reference spec:** [`docs/superpowers/specs/2026-05-06-kanban-pendencias-design.md`](../specs/2026-05-06-kanban-pendencias-design.md)

**Pre-requisite reading:** Antes de tocar em qualquer Server/Client Component novo, leia `node_modules/next/dist/docs/` para confirmar conventions de Next.js 16 (esse projeto está numa versão com breaking changes vs. docs públicos antigos — aviso no `AGENTS.md`).

---

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/migrations/013_pendencias_status.sql` | Migration: ADD COLUMN status, trigger sync, índice, backfill |
| `src/hooks/usePendencias.ts` | Hook único: fetch, CRUD, realtime, transições de status |
| `src/components/team/PendenciasKanban.tsx` | Board do Kanban (orchestra DndContext + colunas) |
| `src/components/team/PendenciaColumn.tsx` | Coluna droppable (recebe cards) |
| `src/components/team/PendenciaCard.tsx` | Card draggable individual |
| `src/components/team/PendenciasSection.tsx` | **MODIFICAR**: usar hook, adicionar toggle Lista/Kanban |

---

## Task 1: Instalar `@dnd-kit/core` e dependências

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar pacotes**

Run (a partir de `obra2-main/obra-main/`):
```bash
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2
```

Expected: três pacotes instalados, `package.json` atualizado, sem erros de peer dependency com React 19.

- [ ] **Step 2: Verificar que o build não quebrou**

Run:
```bash
npm run build
```

Expected: build completa sem erro (`✓ Compiled successfully`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit packages for kanban drag-and-drop"
```

---

## Task 2: Migration de status nas pendências

**Files:**
- Create: `obra2-main/obra-main/supabase/migrations/013_pendencias_status.sql`

- [ ] **Step 1: Escrever a migration**

Conteúdo de `013_pendencias_status.sql`:

```sql
-- 013_pendencias_status.sql
-- Adiciona coluna `status` em pendencias para suportar Kanban com 4 estados.
-- Mantém coluna `concluida` legada sincronizada via trigger até deprecação.

-- 1. Adicionar coluna status com default que preserva pendências existentes
ALTER TABLE pendencias
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'a_fazer'
  CHECK (status IN ('a_fazer','em_andamento','aguardando_aprovacao','concluida'));

-- 2. Backfill: pendências com concluida=true viram status='concluida'
UPDATE pendencias SET status = 'concluida' WHERE concluida = true AND status = 'a_fazer';

-- 3. Índice para queries do Kanban (filtra por projeto + status)
CREATE INDEX IF NOT EXISTS idx_pendencias_project_status
  ON pendencias(project_id, status);

-- 4. Trigger: manter `concluida` em sincronia com `status`
CREATE OR REPLACE FUNCTION sync_pendencia_concluida()
RETURNS TRIGGER AS $$
BEGIN
  NEW.concluida := (NEW.status = 'concluida');
  -- Se está virando concluida e não tinha concluida_em, registra timestamp
  IF NEW.status = 'concluida' AND OLD.status IS DISTINCT FROM 'concluida' THEN
    NEW.concluida_em := COALESCE(NEW.concluida_em, now());
  END IF;
  -- Se está saindo de concluida, limpa os campos
  IF NEW.status <> 'concluida' AND OLD.status = 'concluida' THEN
    NEW.concluida_em := NULL;
    NEW.concluida_por := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_pendencia_sync_concluida ON pendencias;
CREATE TRIGGER tr_pendencia_sync_concluida
  BEFORE INSERT OR UPDATE ON pendencias
  FOR EACH ROW EXECUTE FUNCTION sync_pendencia_concluida();
```

- [ ] **Step 2: Aplicar migration em ambiente local**

Run:
```bash
supabase db push
```

Expected: `013_pendencias_status.sql` listada como aplicada, sem erros.

- [ ] **Step 3: Verificar a migration no banco**

Conectar no Postgres do Supabase (Studio ou `psql`) e rodar:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pendencias' AND column_name = 'status';
```

Expected: 1 linha, `status | text | 'a_fazer'::text`.

Rodar também:
```sql
SELECT status, count(*) FROM pendencias GROUP BY status;
```

Expected: distribuição faz sentido (todas pendências têm status; concluídas viraram `concluida`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_pendencias_status.sql
git commit -m "feat(db): add status column to pendencias for kanban workflow"
```

---

## Task 3: Atualizar tipo `Pendencia` e criar hook `usePendencias`

**Files:**
- Create: `obra2-main/obra-main/src/hooks/usePendencias.ts`
- Modify: `obra2-main/obra-main/src/components/team/PendenciasSection.tsx` (apenas o tipo exportado, não o componente ainda)

- [ ] **Step 1: Criar hook `usePendencias`**

Conteúdo de `src/hooks/usePendencias.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { newId } from '@/lib/utils';

export type PendenciaStatus = 'a_fazer' | 'em_andamento' | 'aguardando_aprovacao' | 'concluida';

export interface Pendencia {
  id: string;
  projectId: string;
  conteudo: string;
  responsavel: string;
  nomeMembro: string;
  createdAt: string;
  status: PendenciaStatus;
  concluida: boolean;
  concluidaPor?: string;
  concluidaEm?: string;
}

interface RawPendencia {
  id: string;
  project_id: string;
  conteudo: string;
  responsavel: string | null;
  nome_membro: string | null;
  created_at: string;
  status?: PendenciaStatus | null;
  concluida: boolean;
  concluida_por?: string | null;
  concluida_em?: string | null;
}

function mapRow(r: RawPendencia): Pendencia {
  // Fallback: se migration 013 ainda não foi aplicada, derivar status de `concluida`
  const status: PendenciaStatus = r.status ?? (r.concluida ? 'concluida' : 'a_fazer');
  return {
    id: r.id,
    projectId: r.project_id,
    conteudo: r.conteudo,
    responsavel: r.responsavel ?? '',
    nomeMembro: r.nome_membro ?? '',
    createdAt: r.created_at,
    status,
    concluida: r.concluida,
    concluidaPor: r.concluida_por ?? undefined,
    concluidaEm: r.concluida_em ?? undefined,
  };
}

export function usePendencias(projectId: string, currentUserName: string) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mantém referência mais recente para uso dentro de callbacks de realtime
  const pendenciasRef = useRef<Pendencia[]>([]);
  pendenciasRef.current = pendencias;

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('pendencias')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setPendencias((data ?? []).map(mapRow));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: re-fetch quando muda algo na tabela pra esse project
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`pendencias:${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pendencias', filter: `project_id=eq.${projectId}` },
        () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, refetch]);

  const adicionar = useCallback(async (
    conteudo: string,
    responsavel: string,
    initialStatus: PendenciaStatus = 'a_fazer',
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!conteudo.trim()) return { ok: false, error: 'Descreva a pendência.' };
    if (!projectId) return { ok: false, error: 'Selecione um projeto.' };
    const { data, error: insertError } = await supabase.from('pendencias').insert({
      id: newId(),
      project_id: projectId,
      conteudo: conteudo.trim(),
      responsavel: responsavel.trim() || currentUserName,
      nome_membro: currentUserName,
      concluida: initialStatus === 'concluida',
      status: initialStatus,
    }).select().maybeSingle();
    if (insertError) return { ok: false, error: insertError.message };
    if (!data) return { ok: false, error: 'Sem permissão para criar pendência.' };
    setPendencias(prev => [...prev, mapRow(data as RawPendencia)]);
    return { ok: true };
  }, [projectId, currentUserName]);

  const moverStatus = useCallback(async (
    id: string,
    novoStatus: PendenciaStatus,
  ): Promise<{ ok: boolean; error?: string }> => {
    const previous = pendenciasRef.current;
    const target = previous.find(p => p.id === id);
    if (!target) return { ok: false, error: 'Pendência não encontrada.' };
    if (target.status === novoStatus) return { ok: true };

    // Update otimista
    setPendencias(prev => prev.map(p =>
      p.id !== id ? p : {
        ...p,
        status: novoStatus,
        concluida: novoStatus === 'concluida',
        concluidaPor: novoStatus === 'concluida' ? currentUserName : undefined,
        concluidaEm: novoStatus === 'concluida' ? new Date().toISOString() : undefined,
      },
    ));

    const { error: updateError } = await supabase
      .from('pendencias')
      .update({
        status: novoStatus,
        concluida_por: novoStatus === 'concluida' ? currentUserName : null,
      })
      .eq('id', id);

    if (updateError) {
      // Reverter
      setPendencias(previous);
      return { ok: false, error: updateError.message };
    }
    return { ok: true };
  }, [currentUserName]);

  const remover = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const previous = pendenciasRef.current;
    setPendencias(prev => prev.filter(p => p.id !== id));
    const { error: deleteError } = await supabase.from('pendencias').delete().eq('id', id);
    if (deleteError) {
      setPendencias(previous);
      return { ok: false, error: deleteError.message };
    }
    return { ok: true };
  }, []);

  return { pendencias, loading, error, adicionar, moverStatus, remover, refetch };
}
```

- [ ] **Step 2: Verificar que compila**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePendencias.ts
git commit -m "feat(pendencias): add usePendencias hook with status transitions"
```

---

## Task 4: Componente `PendenciaCard` (draggable)

**Files:**
- Create: `obra2-main/obra-main/src/components/team/PendenciaCard.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo:

```typescript
'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, User, Clock } from 'lucide-react';
import { Pendencia } from '@/hooks/usePendencias';

interface PendenciaCardProps {
  pendencia: Pendencia;
  canEdit: boolean;
  onRemove: (id: string) => void;
}

export default function PendenciaCard({ pendencia, canEdit, onRemove }: PendenciaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pendencia.id,
    data: { pendencia },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  // Indicador de tempo na coluna: badge amarelo se >7 dias desde criação
  const diasDesdeCriacao = Math.floor(
    (Date.now() - new Date(pendencia.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const stale = diasDesdeCriacao > 7 && pendencia.status !== 'concluida';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-grab active:cursor-grabbing transition-colors ${stale ? 'border-l-4 border-l-amber-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white flex-1 break-words">{pendencia.conteudo}</p>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(pendencia.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-slate-500 hover:text-rose-500 shrink-0"
            aria-label="Remover pendência"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <User size={10} /> {pendencia.responsavel || '—'}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={10} /> {new Date(pendencia.createdAt).toLocaleDateString('pt-BR')}
        </span>
        {stale && <span className="text-amber-500 font-bold">{diasDesdeCriacao}d</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/PendenciaCard.tsx
git commit -m "feat(pendencias): add draggable PendenciaCard component"
```

---

## Task 5: Componente `PendenciaColumn` (droppable)

**Files:**
- Create: `obra2-main/obra-main/src/components/team/PendenciaColumn.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo:

```typescript
'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Pendencia, PendenciaStatus } from '@/hooks/usePendencias';
import PendenciaCard from './PendenciaCard';

interface PendenciaColumnProps {
  status: PendenciaStatus;
  title: string;
  accentClass: string; // ex: 'border-blue-500'
  pendencias: Pendencia[];
  canEdit: boolean;
  onRemove: (id: string) => void;
  onCreateInColumn: (status: PendenciaStatus) => void;
}

export default function PendenciaColumn({
  status,
  title,
  accentClass,
  pendencias,
  canEdit,
  onRemove,
  onCreateInColumn,
}: PendenciaColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] bg-white/[0.02] rounded-2xl p-4 border-t-4 ${accentClass} ${isOver ? 'bg-white/[0.05]' : ''} transition-colors`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{pendencias.length} item(ns)</p>
        </div>
        {canEdit && (
          <button
            onClick={() => onCreateInColumn(status)}
            className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5"
            aria-label={`Criar pendência em ${title}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="space-y-2 min-h-[100px]">
        {pendencias.map(p => (
          <PendenciaCard
            key={p.id}
            pendencia={p}
            canEdit={canEdit}
            onRemove={onRemove}
          />
        ))}
        {pendencias.length === 0 && (
          <div className="text-center py-6 text-[10px] text-slate-600 italic">
            arraste cards para cá
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/PendenciaColumn.tsx
git commit -m "feat(pendencias): add droppable PendenciaColumn component"
```

---

## Task 6: Componente `PendenciasKanban` (board orquestrando colunas)

**Files:**
- Create: `obra2-main/obra-main/src/components/team/PendenciasKanban.tsx`

- [ ] **Step 1: Criar componente**

Conteúdo:

```typescript
'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { usePendencias, PendenciaStatus, Pendencia } from '@/hooks/usePendencias';
import PendenciaColumn from './PendenciaColumn';
import PendenciaCard from './PendenciaCard';

const COLUMNS: Array<{ status: PendenciaStatus; title: string; accentClass: string }> = [
  { status: 'a_fazer',                title: 'A fazer',               accentClass: 'border-slate-500' },
  { status: 'em_andamento',           title: 'Em andamento',          accentClass: 'border-blue-500' },
  { status: 'aguardando_aprovacao',   title: 'Aguardando aprovação',  accentClass: 'border-amber-500' },
  { status: 'concluida',              title: 'Concluída',             accentClass: 'border-emerald-500' },
];

interface PendenciasKanbanProps {
  projectId: string;
  currentUserName: string;
  canEdit: boolean;
}

export default function PendenciasKanban({ projectId, currentUserName, canEdit }: PendenciasKanbanProps) {
  const { pendencias, adicionar, moverStatus, remover } = usePendencias(projectId, currentUserName);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createInColumn, setCreateInColumn] = useState<PendenciaStatus | null>(null);
  const [novoConteudo, setNovoConteudo] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('');

  // PointerSensor com distância de 5px pra não confundir click no botão de remover com drag
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activePendencia = activeId ? pendencias.find(p => p.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over) return;
    const id = String(event.active.id);
    const newStatus = event.over.id as PendenciaStatus;
    const result = await moverStatus(id, newStatus);
    if (!result.ok && result.error) alert(`Erro ao mover: ${result.error}`);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta pendência?')) return;
    const result = await remover(id);
    if (!result.ok && result.error) alert(`Erro ao remover: ${result.error}`);
  };

  const handleCreateSubmit = async () => {
    if (!createInColumn) return;
    const result = await adicionar(novoConteudo, novoResponsavel, createInColumn);
    if (!result.ok && result.error) {
      alert(`Erro: ${result.error}`);
      return;
    }
    setNovoConteudo('');
    setNovoResponsavel('');
    setCreateInColumn(null);
  };

  const pendenciasByStatus = (status: PendenciaStatus): Pendencia[] =>
    pendencias.filter(p => p.status === status);

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <PendenciaColumn
              key={col.status}
              status={col.status}
              title={col.title}
              accentClass={col.accentClass}
              pendencias={pendenciasByStatus(col.status)}
              canEdit={canEdit}
              onRemove={handleRemove}
              onCreateInColumn={(s) => setCreateInColumn(s)}
            />
          ))}
        </div>
        <DragOverlay>
          {activePendencia ? (
            <PendenciaCard pendencia={activePendencia} canEdit={false} onRemove={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {createInColumn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-blue-500" />
              <h3 className="text-lg font-bold text-white">
                Nova pendência em &quot;{COLUMNS.find(c => c.status === createInColumn)?.title}&quot;
              </h3>
            </div>
            <textarea
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              placeholder="Descreva a pendência..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
              rows={3}
              autoFocus
            />
            <input
              type="text"
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              placeholder="Responsável (opcional)"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCreateInColumn(null); setNovoConteudo(''); setNovoResponsavel(''); }}
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

- [ ] **Step 2: Verificar que compila**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/team/PendenciasKanban.tsx
git commit -m "feat(pendencias): add PendenciasKanban board with drag-and-drop"
```

---

## Task 7: Refatorar `PendenciasSection` para usar hook + adicionar toggle Lista/Kanban

**Files:**
- Modify: `obra2-main/obra-main/src/components/team/PendenciasSection.tsx`

Esse arquivo é hoje 243 linhas e mistura fetch, mutation, render. Vamos: (a) substituir o fetch interno pelo hook, (b) adicionar toggle no topo, (c) renderizar `PendenciasKanban` quando ativo.

- [ ] **Step 1: Reescrever o componente**

Substituir TODO o conteúdo de `src/components/team/PendenciasSection.tsx` por:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Circle, Trash2, User, Clock, List, LayoutGrid } from 'lucide-react';
import { usePendencias, Pendencia } from '@/hooks/usePendencias';

// Re-export para manter compatibilidade com imports legados
export type { Pendencia } from '@/hooks/usePendencias';

const VIEW_STORAGE_KEY = 'pendencias_view_mode';
type ViewMode = 'list' | 'kanban';

interface PendenciasSectionProps {
  projectId: string;
  currentUserName: string;
  canEdit?: boolean;
}

export default function PendenciasSection({
  projectId,
  currentUserName,
  canEdit = true,
}: PendenciasSectionProps) {
  const { pendencias, adicionar, moverStatus, remover } = usePendencias(projectId, currentUserName);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [novaPendencia, setNovaPendencia] = useState('');
  const [responsavel, setResponsavel] = useState('');

  // Carregar preferência de view do localStorage
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

  const adicionarPendencia = async () => {
    const result = await adicionar(novaPendencia, responsavel);
    if (!result.ok && result.error) {
      alert(`Erro ao adicionar: ${result.error}`);
      return;
    }
    setNovaPendencia('');
    setResponsavel('');
    setShowAdd(false);
  };

  const toggleConcluida = async (p: Pendencia) => {
    const novoStatus = p.status === 'concluida' ? 'a_fazer' : 'concluida';
    const result = await moverStatus(p.id, novoStatus);
    if (!result.ok && result.error) alert(`Erro: ${result.error}`);
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover esta pendência?')) return;
    const result = await remover(id);
    if (!result.ok && result.error) alert(`Erro: ${result.error}`);
  };

  const pendenciasAbertas = pendencias.filter(p => p.status !== 'concluida');
  const pendenciasConcluidas = pendencias.filter(p => p.status === 'concluida');

  return (
    <div className="glass-card p-8 rounded-[40px] space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Pendências</h2>
          <p className="text-sm text-slate-500">
            {pendenciasAbertas.length} aberta(s), {pendenciasConcluidas.length} concluída(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => switchView('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
              aria-pressed={viewMode === 'list'}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => switchView('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
              aria-pressed={viewMode === 'kanban'}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
          </div>
          {canEdit && viewMode === 'list' && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
            >
              <Plus size={18} /> Nova
            </button>
          )}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <KanbanLazyView
          projectId={projectId}
          currentUserName={currentUserName}
          canEdit={canEdit}
        />
      ) : (
        <>
          {showAdd && (
            <div className="p-4 bg-white/5 rounded-xl space-y-4">
              <textarea
                value={novaPendencia}
                onChange={(e) => setNovaPendencia(e.target.value)}
                placeholder="Descreva a pendência..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
                rows={3}
              />
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Responsável (opcional)"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 text-slate-500 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarPendencia}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {pendencias.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Nenhuma pendência ainda.</div>
          ) : (
            <div className="space-y-3">
              {pendenciasAbertas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Abertas</h3>
                  <div className="space-y-2">
                    {pendenciasAbertas.map(p => (
                      <div key={p.id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                        <button onClick={() => toggleConcluida(p)} className="mt-1">
                          <Circle size={20} className="text-amber-500" />
                        </button>
                        <div className="flex-1">
                          <p className="text-white">{p.conteudo}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><User size={12} /> {p.responsavel}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemove(p.id)} className="text-slate-500 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendenciasConcluidas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Concluídas</h3>
                  <div className="space-y-2">
                    {pendenciasConcluidas.map(p => (
                      <div key={p.id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl opacity-60">
                        <button onClick={() => toggleConcluida(p)} className="mt-1">
                          <CheckCircle size={20} className="text-green-500" />
                        </button>
                        <div className="flex-1">
                          <p className="text-white line-through">{p.conteudo}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><User size={12} /> {p.responsavel}</span>
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle size={12} /> Concluída por {p.concluidaPor} em {p.concluidaEm ? new Date(p.concluidaEm).toLocaleDateString('pt-BR') : ''}
                            </span>
                          </div>
                        </div>
                        {canEdit && (
                          <button onClick={() => handleRemove(p.id)} className="text-slate-500 hover:text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Lazy import do Kanban para não pagar @dnd-kit no bundle quando user fica na lista
import dynamic from 'next/dynamic';
const KanbanLazyView = dynamic(() => import('./PendenciasKanban'), {
  ssr: false,
  loading: () => <div className="text-center py-8 text-slate-500">Carregando Kanban...</div>,
});
```

- [ ] **Step 2: Verificar que compila**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Verificar que o build passa**

Run:
```bash
npm run build
```

Expected: build completa, sem warnings de import quebrados.

- [ ] **Step 4: Commit**

```bash
git add src/components/team/PendenciasSection.tsx
git commit -m "feat(pendencias): add list/kanban toggle and use shared hook"
```

---

## Task 8: Smoke test manual (golden path + edge cases)

**Files:**
- (nenhuma alteração de código — verificação manual)

Como o projeto não tem framework de testes instalado (decisão consciente: adicionar Vitest fica para Spec B onde o volume de lógica justifica), validação aqui é manual com checklist preciso.

- [ ] **Step 1: Iniciar dev server**

Run:
```bash
npm run dev
```

Expected: servidor sobe em `http://localhost:3000` sem erros no console.

- [ ] **Step 2: Golden path no browser**

Faça login com usuário que tenha permissão `pendencias=editar` em pelo menos uma obra.

Verificar TODOS os pontos abaixo:

- [ ] Aba "Pendências" carrega na visualização **Lista** (default).
- [ ] Toggle Lista/Kanban está visível no topo direito.
- [ ] Clicar em "Kanban" mostra 4 colunas: A fazer / Em andamento / Aguardando aprovação / Concluída.
- [ ] Recarregar a página mantém a visualização escolhida (localStorage).
- [ ] Pendências existentes aparecem na coluna correta (todas começam em "A fazer", exceto as que já estavam `concluida=true`).
- [ ] Botão "+" no topo de uma coluna abre modal e cria pendência **naquela coluna**.
- [ ] Arrastar card de "A fazer" para "Em andamento" persiste (recarregar mantém).
- [ ] Arrastar card para "Concluída" risca ele na visualização Lista (verifica que `concluida` legada foi sincronizada).
- [ ] Card com mais de 7 dias mostra indicador amarelo (`Xd`).
- [ ] Botão de remover (lixeira) no card funciona sem disparar drag por engano.
- [ ] Visualização Lista continua funcionando exatamente como antes (toggle individual via Circle/CheckCircle).

- [ ] **Step 3: Edge cases**

- [ ] Abrir o sistema em **duas abas** com mesmo usuário, mesma obra. Mover card numa aba → outra aba reflete em <2s (realtime).
- [ ] Como usuário com `canEdit=false`: botão "+" e lixeira escondidos; drag não persiste (RLS bloqueia).
- [ ] Sem internet (offline temporário): drag → toast "Erro ao mover" + card volta pra coluna original.
- [ ] Criar pendência com texto vazio → alert "Descreva a pendência."
- [ ] Mover card para a mesma coluna onde já está → no-op silencioso, sem requisição extra (verificar Network tab).

- [ ] **Step 4: Verificação no banco**

Após movimentações no Kanban, conectar no Supabase Studio e verificar:

```sql
SELECT id, status, concluida, concluida_em, concluida_por
FROM pendencias
ORDER BY created_at DESC LIMIT 5;
```

Expected:
- Linhas com `status='concluida'` têm `concluida=true` e `concluida_em` preenchido.
- Linhas movidas DE concluída para outra coluna têm `concluida=false`, `concluida_em=null`, `concluida_por=null`.

- [ ] **Step 5: Commit final do plano**

Se tudo passou:

```bash
git log --oneline -10  # confirmar histórico limpo
```

Expected: 7 commits do plano (Tasks 1-7), em ordem cronológica, mensagens claras.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ 4 colunas configuradas (`a_fazer`, `em_andamento`, `aguardando_aprovacao`, `concluida`) — Task 6
- ✅ Migration ALTER TABLE + trigger sync — Task 2
- ✅ Backfill de `concluida=true` — Task 2 step 1
- ✅ Toggle Lista/Kanban com persistência localStorage — Task 7
- ✅ Hook compartilhado `usePendencias` — Task 3
- ✅ Drag-and-drop com `@dnd-kit/core` — Tasks 1, 4-6
- ✅ Update otimista com rollback — Task 3 (`moverStatus`)
- ✅ Realtime entre abas — Task 3 (channel subscription)
- ✅ Indicador "stale" >7 dias — Task 4
- ✅ Botão "+" cria na coluna selecionada — Task 6
- ✅ Permissões via `canEdit` — Tasks 4, 5, 6, 7
- ⚠️ Testes unitários do hook — **omitidos conscientemente** (projeto sem framework de testes; smoke test manual cobre); recomendado adicionar Vitest no Spec B.
- ✅ Tabela `concluida` legada preservada via trigger — Task 2

**Placeholder scan:** nenhum TBD/TODO/"similar to". Todos os steps com código completo.

**Type consistency:** `Pendencia`, `PendenciaStatus`, signatures de `adicionar`/`moverStatus`/`remover` consistentes entre Tasks 3 → 4 → 5 → 6 → 7.

**Risco residual:**
- Migration depende de coluna `concluida_em` e `concluida_por` já existirem em `pendencias` (vêm da migration 001). Se vierem com nomes diferentes em algum ambiente, trigger quebra. Conferir antes de aplicar em prod.
- `@dnd-kit/core` usa `react-dom`/`react` 19 — no momento da escrita já tem suporte oficial, mas confirmar no install que não há warning de peer dep.
