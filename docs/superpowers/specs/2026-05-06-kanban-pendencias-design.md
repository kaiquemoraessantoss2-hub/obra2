# Spec — Kanban de Pendências

**Data:** 2026-05-06
**Status:** Em design (aguardando review do usuário)
**Escopo:** Adicionar visualização Kanban à seção de pendências por obra, mantendo a lista atual como visualização alternativa.

---

## 1. Contexto e motivação

Hoje `PendenciasSection.tsx` exibe pendências em duas listas (Abertas / Concluídas) com toggle binário (`concluida: true/false`). Esse modelo não reflete o ciclo real de vida de uma pendência em canteiro de obra residencial:

- Engenheiro abre pendência → mestre de obras inicia a execução → conclui execução → gerente verifica → pendência fechada.

Hoje todos esses passos colapsam em "aberta" ou "concluída", sem visibilidade do que está em andamento ou aguardando verificação. O Kanban resolve isso introduzindo estados intermediários e visualização por colunas.

## 2. Decisões de design

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Quantidade de colunas | 4 | Cobrir o fluxo real (incluir verificação/aprovação) sem inflar |
| Estados | `a_fazer` → `em_andamento` → `aguardando_aprovacao` → `concluida` | Mapeamento direto do fluxo de canteiro residencial |
| Schema | `ALTER TABLE pendencias ADD COLUMN status` | Reaproveita a tabela existente; sem nova entidade |
| Migração de dados | `concluida=true` → `status='concluida'`; `concluida=false` → `status='a_fazer'` | Preserva semântica atual sem perda de dados |
| UI | Adicionar toggle "Lista / Kanban" na seção, lista continua sendo o default | Não força mudança de hábito; usuário escolhe |
| Drag-and-drop | Biblioteca leve client-side (`@dnd-kit/core`) | Padrão React acessível, sem dependências pesadas |
| Permissões | Quem pode editar (`canEdit`) pode mover qualquer card; sem restrição por coluna no MVP | Simplicidade; permissões granulares por coluna ficam para v2 |

## 3. Mudanças no banco

### Migration
```sql
-- adicionar status com default que preserva pendências existentes
ALTER TABLE pendencias ADD COLUMN status text NOT NULL DEFAULT 'a_fazer'
  CHECK (status IN ('a_fazer','em_andamento','aguardando_aprovacao','concluida'));

-- popular status com base em concluida (one-shot)
UPDATE pendencias SET status = 'concluida' WHERE concluida = true;

-- índice para filtro por (project_id, status)
CREATE INDEX idx_pendencias_project_status ON pendencias(project_id, status);
```

### Coluna `concluida` legada

**Manter por enquanto.** Razões:
- Todos os clients atuais leem essa coluna; remover quebra clientes em produção.
- Trigger mantém os dois campos em sincronia até deprecação completa.

```sql
CREATE OR REPLACE FUNCTION sync_pendencia_concluida()
RETURNS TRIGGER AS $$
BEGIN
  NEW.concluida := (NEW.status = 'concluida');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_pendencia_sync_concluida
  BEFORE INSERT OR UPDATE ON pendencias
  FOR EACH ROW EXECUTE FUNCTION sync_pendencia_concluida();
```

Plano de deprecação da `concluida`: remover em sprint posterior, depois que clients estiverem todos lendo `status` (não faz parte deste spec).

## 4. Mudanças no código

### Tipos (`PendenciasSection.tsx`)

```ts
type PendenciaStatus = 'a_fazer' | 'em_andamento' | 'aguardando_aprovacao' | 'concluida';

interface Pendencia {
  // ... campos existentes
  status: PendenciaStatus;
}
```

### Componentes novos

```
src/components/team/
├── PendenciasSection.tsx         (existente — adicionar toggle Lista/Kanban)
├── PendenciasKanban.tsx          (novo — board com 4 colunas)
├── PendenciaCard.tsx             (novo — card individual draggable)
└── PendenciaColumn.tsx           (novo — coluna droppable)
```

### Hook compartilhado

```
src/hooks/usePendencias.ts        (novo — fetch, mutations, realtime sync)
```

Centraliza CRUD e canal Supabase, consumido por `PendenciasSection` (lista) e `PendenciasKanban` (board). Garante que os dois views usam exatamente os mesmos dados.

### Fluxo de drag-and-drop

1. Usuário arrasta card da coluna A para coluna B.
2. Otimisticamente atualiza estado local (`setPendencias`).
3. Dispara `supabase.from('pendencias').update({ status: novoStatus }).eq('id', id)`.
4. Em caso de erro: reverte estado local + toast de erro.
5. Realtime channel propaga para outras abas/usuários.

## 5. UX

- Botão de toggle no topo da seção: `[Lista] [Kanban]` (mantém preferência em `localStorage`).
- Kanban com 4 colunas em layout horizontal scrollável; em mobile vira swipe horizontal.
- Card mostra: título da pendência, responsável (avatar), data de criação, indicador visual de tempo na coluna atual (badge de cor se >7 dias).
- Botão "+" no topo de cada coluna para criar pendência já naquele status.
- Botão de remover continua existindo no card (canEdit).

## 6. Real-time sync

O canal Supabase já existe pra `pendencias`. Mudança: garantir que tanto a Lista quanto o Kanban se inscrevem no mesmo canal e re-renderizam ao receber `INSERT/UPDATE/DELETE`. O hook `usePendencias` centraliza isso.

## 7. Erros e edge cases

| Cenário | Comportamento |
|---------|---------------|
| Drag falha por permissão (RLS) | Reverte UI, toast: "Você não tem permissão para mover esta pendência" |
| Drag falha por rede | Reverte UI, toast: "Erro de conexão. Tente novamente." |
| Pendência removida em outra aba durante drag | Card desaparece após drop, sem erro |
| Status enviado é inválido (CHECK constraint) | Bloqueado pelo banco; toast genérico de erro |
| Migration não aplicada (campo `status` ausente) | Hook detecta erro, faz fallback para usar `concluida` apenas (status="a_fazer" ou "concluida") |

## 8. Testes

- Unit: `usePendencias` (mocking Supabase) — garantir transições de status corretas.
- Integration: drag de card entre colunas atualiza no banco.
- Manual: testar real-time entre duas abas, mover card em uma e verificar re-render na outra.

## 9. Fora do escopo

- Permissões por coluna (ex.: só gerente pode mover para "Concluída"). v2.
- Filtros avançados (por responsável, por data). v2.
- Histórico de movimentações por pendência. v2.
- Notificação por WhatsApp ao mover para "Aguardando aprovação". v2.
- Remoção da coluna `concluida` legada. Sprint separado.

## 10. Critério de "pronto"

- [ ] Migration aplicada em dev e em produção sem downtime.
- [ ] Toggle Lista/Kanban funciona em desktop e mobile.
- [ ] Drag-and-drop persiste no banco e propaga via realtime.
- [ ] Pendências existentes mantêm `concluida=true` ↔ `status='concluida'`.
- [ ] Nenhum cliente em produção quebrou (campo `concluida` ainda funciona).
