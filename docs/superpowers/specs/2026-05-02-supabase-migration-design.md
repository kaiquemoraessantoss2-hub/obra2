# Spec: Migração Completa localStorage → Supabase

**Data:** 2026-05-02  
**Status:** Aprovado  
**Projeto:** ObraFlow

---

## Problema

Todos os dados da aplicação (usuários, empresas, projetos, fases, medições, pendências, etc.) estão sendo salvos no `localStorage` do navegador. Isso faz com que os dados sejam perdidos ao acessar de outro dispositivo ou navegador, pois cada navegador tem seu próprio storage isolado.

---

## Solução

Migrar 100% do armazenamento de dados para o Supabase (PostgreSQL), usando Supabase Auth para autenticação de todos os usuários.

---

## Arquitetura de Auth

Todos os usuários (SUPERADMIN, ADMIN, ENGINEER, VIEWER e membros do time) são gerenciados pelo **Supabase Auth**.

```
Supabase Auth (auth.users)
    └── profiles
            ├── id          → FK auth.users.id
            ├── company_id  → FK companies.id
            ├── name
            ├── role        → SUPERADMIN | ADMIN | ENGINEER | VIEWER
            └── is_active
```

- Login: `supabase.auth.signInWithPassword({ email, password })`
- Sessão: gerenciada automaticamente pelo Supabase (JWT + cookie)
- Logout: `supabase.auth.signOut()`
- Reset de senha: via Supabase Auth email

---

## Tabelas do Banco de Dados

### `companies`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
name          text NOT NULL
plan          text NOT NULL DEFAULT 'Básico'
monthly_value numeric DEFAULT 0
plan_start_date date
plan_end_date   date
billing_status  text DEFAULT 'ACTIVE'
is_paused       boolean DEFAULT false
active_users    integer DEFAULT 0
created_at      timestamptz DEFAULT now()
```

### `profiles`
```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
company_id  uuid REFERENCES companies(id) ON DELETE SET NULL
name        text NOT NULL
role        text NOT NULL DEFAULT 'VIEWER'
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
```

### `projects`
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE
name             text NOT NULL
location         text
total_floors     integer DEFAULT 0
basements        integer DEFAULT 0
has_leisure      boolean DEFAULT false
has_atrium       boolean DEFAULT false
technical_areas  integer DEFAULT 0
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
```

### `floors`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
number      integer NOT NULL
label       text NOT NULL
type        text NOT NULL DEFAULT 'REGULAR'
phase       text
created_at  timestamptz DEFAULT now()
```

### `project_phases`
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
name             text NOT NULL
icon             text
color            text
progress         integer DEFAULT 0
status           text DEFAULT 'NOT_STARTED'
weight           integer DEFAULT 1
start_date       date
end_date         date
actual_start_date date
actual_end_date   date
responsible      text
observations     text
depends_on       uuid[]
approved_by      text
approved_at      timestamptz
blocked_reason   text
sub_steps        jsonb DEFAULT '[]'
history          jsonb DEFAULT '[]'
sort_order       integer DEFAULT 0
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()
```

> `sub_steps` armazena o array de SubStep como JSONB (incluindo floorExecutions aninhados), evitando normalização excessiva de dados hierárquicos complexos.

### `building_configs`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id          uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE
name                text NOT NULL
address             text
total_floors        integer DEFAULT 0
basements           integer DEFAULT 0
has_leisure         boolean DEFAULT false
has_atrium          boolean DEFAULT false
has_rooftop         boolean DEFAULT false
technical_areas     integer DEFAULT 0
apartments_per_floor integer DEFAULT 0
total_units         integer DEFAULT 0
floors              jsonb DEFAULT '[]'
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

### `team_members`
Membros do time são usuários Supabase Auth com role=VIEWER. Esta tabela armazena metadados extras como permissões por módulo.

```sql
id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
owner_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE
name         text NOT NULL
email        text NOT NULL
permissions  jsonb DEFAULT '{}'
is_active    boolean DEFAULT true
created_at   timestamptz DEFAULT now()
```

### `calendar_events`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE
title       text NOT NULL
date        date NOT NULL
description text
created_by  uuid REFERENCES profiles(id)
created_at  timestamptz DEFAULT now()
```

### `gargalos`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE
data        jsonb NOT NULL DEFAULT '{}'
created_by  uuid REFERENCES profiles(id)
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### `medicoes`
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
disciplina     text NOT NULL
contratante    text
descricao      text NOT NULL
quantidade     numeric NOT NULL DEFAULT 0
unidade        text
valor_unitario numeric NOT NULL DEFAULT 0
valor_total    numeric NOT NULL DEFAULT 0
created_at     timestamptz DEFAULT now()
created_by     text
```

### `pendencias`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
conteudo      text NOT NULL
responsavel   text
nome_membro   text
concluida     boolean DEFAULT false
concluida_por text
concluida_em  timestamptz
created_at    timestamptz DEFAULT now()
```

---

## Segurança (RLS)

Cada tabela terá Row Level Security habilitado. Políticas padrão:

- **SUPERADMIN**: acesso total a todos os dados
- **ADMIN/ENGINEER/VIEWER**: acessa apenas dados da própria `company_id`
- Usuário não autenticado: sem acesso (nenhum dado exposto publicamente)

Exemplo de política:
```sql
CREATE POLICY "users_see_own_company" ON projects
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
```

---

## Fluxo de dados após migração

**Leitura:**
```typescript
// Antes
const data = localStorage.getItem('key');

// Depois
const { data } = await supabase.from('tabela').select('*').eq('company_id', companyId);
```

**Escrita:**
```typescript
// Antes
localStorage.setItem('key', JSON.stringify(data));

// Depois
await supabase.from('tabela').insert(data);
// ou
await supabase.from('tabela').upsert(data);
```

---

## Plano de Execução (7 Partes)

| Parte | Escopo | Arquivos alterados |
|---|---|---|
| 1 | SQL: criar tabelas + RLS no Supabase | Novo arquivo `supabase/migrations/001_initial_schema.sql` |
| 2 | Auth: login, users, companies, projects | `lib/auth.ts`, `app/api/admin/users/route.ts` |
| 3 | Project Storage: fases, config, execuções | `lib/projectStorage.ts` |
| 4 | Construction Context + Building Storage | `context/ConstructionContext.tsx`, `lib/buildingStorage.ts` |
| 5 | Team: membros, login, credenciais | `components/team/AddMemberModal.tsx`, `TeamPage.tsx`, `LoginPage.tsx` |
| 6 | Medições + Pendências | `components/team/MedicaoObraSection.tsx`, `PendenciasSection.tsx` |
| 7 | Calendar + Gargalos | `lib/auth.ts` (funções calendar/gargalos) |

---

## Considerações de Migração de Dados Existentes

Os dados atuais presos no localStorage de cada usuário serão perdidos após a migração (pois nunca chegaram ao banco). Para preservar dados existentes, a ferramenta de migração em `/api/migrate` pode ser executada antes da troca, exportando os dados do localStorage para o Supabase.

---

## Arquivos que NÃO mudam

- Lógica de UI dos componentes (apenas as funções de storage são substituídas)
- `lib/buildingStorage.ts` — funções de cálculo (`recalculateSubStepProgress`, etc.) permanecem
- `types/index.ts` — os tipos TypeScript continuam os mesmos
