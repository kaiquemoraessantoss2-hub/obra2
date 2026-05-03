# Catálogo de Planos — Design

**Data:** 2026-05-03
**Status:** Aprovado para implementação
**Escopo:** SUPERADMIN

## Problema

Hoje, no painel SUPERADMIN, o botão "alterar plano" de uma empresa abre um `prompt()` nativo do navegador (`src/app/page.tsx:1171`) com 3 opções hardcoded (`Básico`/`Pro`/`Empresa`) e preços fixos no código (`199`/`499`/`1200`). Três problemas:

1. UX ruim — `prompt()` é fora do design do sistema.
2. Planos não são editáveis nem extensíveis — nome, preço, limite de usuários e módulos liberados estão espalhados entre `src/types/plans.ts` (`PLAN_LIMITS`) e o handler em `page.tsx`.
3. Bug de persistência — após escolher um plano e recarregar a página, o valor volta ao anterior. O `saveCompanies` em `src/lib/auth.ts:334` engole erros e o salvamento é fire-and-forget.

## Decisões

| # | Decisão | Justificativa |
|---|---------|---------------|
| D1 | Catálogo de planos vira tabela `plans` no Supabase | Permite criar/editar/excluir planos sem deploy |
| D2 | Aba "Planos" só para SUPERADMIN | Catálogo é global ao sistema |
| D3 | Catálogo é fonte da verdade — alterar um plano reflete imediatamente em todas as empresas que o usam | Evita "snapshots" divergentes |
| D4 | Excluir plano é bloqueado se houver empresas usando | Migração explícita pelo botão azul |
| D5 | Modal "alterar plano" mostra cards visuais com todos os planos do catálogo | Facilita comparação |
| D6 | Botão azul "alterar plano" da linha continua sendo por empresa (não muda escopo) | Já era o comportamento esperado |

## Modelo de dados

### Nova tabela `plans`

```sql
CREATE TABLE plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text UNIQUE NOT NULL,
  monthly_value numeric NOT NULL DEFAULT 0,
  max_members   integer NOT NULL DEFAULT 0,
  modules       jsonb   NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

Formato do `modules` (jsonb): mapa `AppModule -> AccessLevel` (`'BLOQUEADO' | 'VER' | 'EDITAR'`), usando os tipos já definidos em `src/types/plans.ts`. Exemplo:

```json
{
  "DASHBOARD": "VER",
  "CRONOGRAMA": "VER",
  "PAVIMENTOS": "BLOQUEADO",
  "MEDICAO": "EDITAR",
  "DOCUMENTOS": "BLOQUEADO",
  "PENDENCIAS": "VER",
  "MEDICAO_OBRA": "VER"
}
```

### RLS

```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_all_authenticated" ON plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "plans_insert_superadmin" ON plans
  FOR INSERT WITH CHECK (is_superadmin());

CREATE POLICY "plans_update_superadmin" ON plans
  FOR UPDATE USING (is_superadmin());

CREATE POLICY "plans_delete_superadmin" ON plans
  FOR DELETE USING (is_superadmin());
```

### Seed

Migration semeia os 3 planos atuais usando os valores em `PLAN_LIMITS` (`src/types/plans.ts:42`):

| name    | monthly_value | max_members | modules                                                                                       |
|---------|--------------:|------------:|-----------------------------------------------------------------------------------------------|
| Básico  |           199 |           0 | DEFAULT_PERMISSIONS                                                                           |
| Pro     |           499 |           3 | DEFAULT_PERMISSIONS + MEDICAO=VER, DOCUMENTOS=VER                                              |
| Empresa |          1200 |           5 | Todos os módulos como `EDITAR`                                                                |

Os valores exatos de cada `modules` no seed serão refinados durante a implementação para alinhar com o que `PLAN_LIMITS` representa hoje.

### Tabela `companies`

Sem mudança estrutural. O campo `plan` (`text`) continua armazenando o **nome** do plano. Funciona como FK lógica para `plans.name`. Não usamos FK física para evitar acoplar nomes a IDs e simplificar renomeação (será feita por `UPDATE plans SET name=... ; UPDATE companies SET plan=...` numa transação na hora de renomear).

## Componentes (Frontend)

### `src/components/PlansCatalog.tsx` — Aba "Planos"

- Sidebar: novo item visível só se `currentUser.role === 'SUPERADMIN'`, ao lado de "Admin Dashboard". `activeTab === 'plans_catalog'`.
- Header: título "Catálogo de Planos" + botão "+ Novo Plano".
- Grid de cards (1 por plano), cada card mostra:
  - Nome
  - Preço mensal (R$/mês)
  - Limite de usuários ("Até N usuários" — N=0 = "Sem usuários adicionais")
  - Resumo dos módulos: "Dashboard: Ver · Medição: Editar..."
  - Badge "X empresas usando"
  - Ações: **Editar** (lápis) · **Excluir** (lixeira)

### `src/components/PlanFormModal.tsx` — Criar/editar plano

- Campo **Nome** (text, único case-insensitive)
- Campo **Preço mensal** (number ≥ 0)
- Campo **Limite de usuários** (number ≥ 0)
- Tabela de módulos: uma linha por módulo de `ALL_MODULES` (`src/types/plans.ts:58`); cada linha tem 3 radio buttons `Bloqueado | Ver | Editar`.
- Footer: **Cancelar** · **Salvar**
- Validação inline (nome único, números ≥ 0).

### `src/components/ChangePlanModal.tsx` — Substitui o `prompt()`

- Título: `Alterar plano de {empresa.name}`
- Subtítulo: `Plano atual: {empresa.plan} — R$ {empresa.monthlyValue}/mês`
- Grid de cards (mesmos do catálogo, em modo "selecionável"):
  - Plano atual fica com badge "Atual" e borda destacada
  - Click seleciona (borda azul)
- Footer: **Cancelar** · **Confirmar alteração** (desabilitado até selecionar um plano diferente do atual).
- Ao confirmar:
  1. `await saveCompany({ ...company, plan: selected.name, monthlyValue: selected.monthly_value })`
  2. Se erro → toast vermelho, **sem** atualizar estado local
  3. Se sucesso → `loadCompanies()` e `setCompanies(fresh)` (fonte da verdade = banco)
  4. Toast verde
  5. Fecha modal

### Substituição em `page.tsx`

`onChangePlan` em `src/app/page.tsx:1170-1179` deixa de usar `prompt()`. Em vez disso, abre `<ChangePlanModal>` controlado por estado local (`changePlanCompany: Company | null`).

## Camada de dados (`src/lib/auth.ts` ou novo `src/lib/plans.ts`)

Funções novas em `src/lib/plans.ts`:

```ts
export interface Plan {
  id: string;
  name: string;
  monthlyValue: number;
  maxMembers: number;
  modules: Record<AppModule, AccessLevel>;
  isActive: boolean;
}

export async function loadPlans(): Promise<Plan[]>;
export async function savePlan(plan: Omit<Plan, 'id'> & { id?: string }): Promise<{ ok: boolean; error?: string }>;
export async function deletePlan(id: string): Promise<{ ok: boolean; error?: string; reason?: 'in_use' }>;
export async function countCompaniesByPlanName(): Promise<Record<string, number>>;
```

## Correção do bug de persistência

Em `src/lib/auth.ts`:

1. Mudar assinatura de `saveCompany` para retornar `Promise<{ ok: boolean; error?: string }>` em vez de `void`. O `console.error` continua, mas o erro também é propagado.
2. Substituir o `saveCompanies(updated)` em `src/app/page.tsx:1176` por `saveCompany(updatedCompany)` único, com `await`, e tratamento de erro:
   ```ts
   const result = await saveCompany(updatedCompany);
   if (!result.ok) {
     setToast({ message: `Erro ao alterar plano: ${result.error}`, type: 'error' });
     return; // não atualiza estado local
   }
   const fresh = await loadCompanies();
   setCompanies(fresh);
   ```
3. Investigação de causa raiz a fazer durante a implementação:
   - Verificar se RLS de INSERT em `companies` (`is_superadmin()`) está bloqueando o lado INSERT do `upsert` quando o usuário SUPERADMIN faz a operação. Se sim, considerar mudar de `upsert` para `update` puro (já que o id existe).
   - Verificar se há condição de corrida com algum `loadCompanies` em outro `useEffect`.
4. Aplicar o mesmo padrão (await + checagem de erro + reload) a todas as mutações de `companies` no `AdminPanel`: renovar plano, pausar, etc.

## Removeções

- `PLAN_LIMITS` em `src/types/plans.ts:42` deixa de ser fonte da verdade. Vira função `getPlanLimits(planName)` que lê do estado carregado de `plans`. Ou simplesmente passa-se a usar `Plan` diretamente.
- O `type PlanType = 'BASIC' | 'GOLD' | 'PRO_MAX'` em `src/types/plans.ts:30` provavelmente sai (representa um modelo antigo diferente dos planos do catálogo). Confirmar uso antes de remover.

## Migração

Nova migration `supabase/migrations/004_plans_catalog.sql`:
1. Cria tabela `plans` + RLS.
2. `INSERT` dos 3 planos atuais com `monthly_value` e `max_members` vindos do `PLAN_LIMITS` atual.
3. Não toca `companies`.

## Fora do escopo

- Histórico de mudanças de plano por empresa.
- Plano com período de avaliação / desconto.
- Upgrade/downgrade self-service para clientes.
- Cobrança automática.
