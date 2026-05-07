# Spec — Sistema de Boletim de Medição

**Data:** 2026-05-06
**Status:** Em design (aguardando review do usuário)
**Escopo:** Kanban de medições, branding por empresa, geração de PDF profissional do Boletim de Medição, e relatórios históricos.

---

## 1. Contexto e motivação

Hoje `MedicaoObraSection.tsx` exibe medições como tabela plana, sem fluxo de aprovação e com export apenas em CSV. Construtoras de prédio residencial precisam de:

1. **Workflow de aprovação visual** — engenheiro lança, gerente analisa, aprova, marca como pago.
2. **Boletim de Medição** — documento PDF profissional, com identidade visual da empresa, que vai para aprovação do cliente/superior.
3. **Audit trail** — o documento que foi aprovado precisa ser imutável; não pode mudar quando alguém edita medições depois.
4. **Histórico** — listar boletins gerados para re-download e consulta.

## 2. Decisões de design

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Card do Kanban | Medição individual (Opção 3 híbrida) | Reaproveita schema existente; não introduz entidade "Boletim ativo" |
| Colunas do Kanban | `Lançada` → `Em análise` → `Aprovada` → `Paga` | Cobre o ciclo de aprovação + pagamento simplificado |
| Boletim | Snapshot imutável gerado no export | Resolve audit trail sem complicar o modelo de dados |
| Stack do PDF | HTML + CSS template renderizado server-side via Puppeteer | Qualidade tipográfica de impressão; reaproveita componentes web |
| Storage do PDF | Supabase Storage (bucket `boletins/`) | Mesma plataforma; controle de acesso via RLS |
| Numeração | Sequencial por empresa, gerada no momento do export | Cada empresa começa do #1, sem colisão |
| Branding | Campos novos em `companies` | CNPJ, endereço obrigatórios; CREA opcional |
| Relatórios | Listagem dos snapshots em `boletim_exports` | Re-download do PDF original a qualquer momento |

## 3. Mudanças no banco

### Migration 1 — status nas medições

```sql
ALTER TABLE medicoes ADD COLUMN status text NOT NULL DEFAULT 'lancada'
  CHECK (status IN ('lancada','em_analise','aprovada','paga'));

ALTER TABLE medicoes ADD COLUMN aprovada_por text;
ALTER TABLE medicoes ADD COLUMN aprovada_em timestamptz;
ALTER TABLE medicoes ADD COLUMN paga_em timestamptz;

CREATE INDEX idx_medicoes_project_status ON medicoes(project_id, status);
```

### Migration 2 — branding da empresa

```sql
ALTER TABLE companies ADD COLUMN logo_url text;
ALTER TABLE companies ADD COLUMN cnpj text;
ALTER TABLE companies ADD COLUMN endereco text;
ALTER TABLE companies ADD COLUMN telefone text;
ALTER TABLE companies ADD COLUMN email_contato text;
ALTER TABLE companies ADD COLUMN responsavel_tecnico text;
ALTER TABLE companies ADD COLUMN responsavel_tecnico_crea text;  -- opcional
ALTER TABLE companies ADD COLUMN proximo_numero_boletim integer NOT NULL DEFAULT 1;
```

`proximo_numero_boletim` é um contador que incrementa atomicamente em cada export (via `UPDATE ... RETURNING` em transação).

### Migration 3 — snapshot dos boletins exportados

```sql
CREATE TABLE boletim_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  numero integer NOT NULL,                    -- sequencial por empresa
  gerado_em timestamptz NOT NULL DEFAULT now(),
  gerado_por text NOT NULL,
  periodo_inicio date,                         -- período coberto pelo boletim
  periodo_fim date,
  total numeric(15,2) NOT NULL,
  medicoes_snapshot jsonb NOT NULL,            -- cópia das medições no momento do export
  empresa_snapshot jsonb NOT NULL,             -- cópia do branding no momento do export
  pdf_url text,                                -- URL no Supabase Storage; null durante 'gerando'
  status text NOT NULL DEFAULT 'gerando'
    CHECK (status IN ('gerando','pronto','falhou')),
  UNIQUE(company_id, numero)                   -- numeração não repete na empresa
);

CREATE INDEX idx_boletim_exports_company_project ON boletim_exports(company_id, project_id, gerado_em DESC);

-- RLS: usuários só veem boletins da sua empresa
ALTER TABLE boletim_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boletim_exports_select_own_company" ON boletim_exports
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

### Storage

Bucket `boletins/` com path `{company_id}/{boletim_id}.pdf`. RLS no Storage limita acesso aos usuários da empresa dona.

## 4. Mudanças no código

### Componentes novos

```
src/components/team/
├── MedicaoObraSection.tsx         (existente — adicionar toggle Lista/Kanban)
├── MedicoesKanban.tsx             (novo — board com 4 colunas)
├── MedicaoCard.tsx                (novo — card draggable com seleção múltipla)
├── ExportarBoletimModal.tsx       (novo — modal de configuração do export)
└── BoletinsHistoricoSection.tsx   (novo — Feature 5: listagem de boletins)

src/components/settings/
└── EmpresaBrandingForm.tsx        (novo — Feature 4: cadastro de branding)

src/lib/boletim/
├── pdfTemplate.tsx                (novo — template React do PDF)
├── generateBoletimPDF.ts          (novo — server: HTML → PDF via Puppeteer)
└── numeracao.ts                   (novo — server: incrementa contador atomicamente)

src/app/api/boletins/
├── route.ts                       (POST: gera boletim novo)
└── [id]/route.ts                  (GET: re-download do PDF)
```

### Hook compartilhado

```
src/hooks/useMedicoes.ts           (novo — fetch, mutations, realtime, status transitions)
```

## 5. Fluxo de geração do Boletim

A geração envolve operação cara (Puppeteer 2-5s) e operação atômica (numeração). Não pode ficar tudo numa transação longa, senão vira gargalo de locks. Fluxo dividido em três fases:

```
Fase A — Reserva de número (transação CURTA, <100ms):
  1. BEGIN
  2. SELECT FOR UPDATE em companies WHERE id = $company_id
  3. UPDATE companies SET proximo_numero_boletim = proximo_numero_boletim + 1
  4. SELECT das medições selecionadas → snapshot JSONB
  5. SELECT da company → branding snapshot JSONB
  6. INSERT em boletim_exports (numero, snapshots, pdf_url=NULL, status='gerando')
  7. COMMIT  → libera lock; outros exports já podem prosseguir

Fase B — Geração do PDF (sem lock, lenta):
  8. Renderiza HTML template (React renderToStaticMarkup)
  9. Puppeteer: HTML → PDF buffer
  10. Upload para Supabase Storage em {company_id}/{boletim_id}.pdf

Fase C — Finalização (UPDATE simples):
  11. UPDATE boletim_exports SET pdf_url = $url, status = 'pronto' WHERE id = $boletim_id
```

**Estado intermediário:** Adicionar coluna `status` em `boletim_exports`:
```sql
ALTER TABLE boletim_exports ADD COLUMN status text NOT NULL DEFAULT 'pronto'
  CHECK (status IN ('gerando','pronto','falhou'));
```

**Recuperação de falha:**
- Se Fase B/C falham, `boletim_exports` fica com `status='gerando'`. Cron job (ou job manual) marca como `'falhou'` após 5 min e oferece retry.
- Número fica "queimado" (gap na sequência) — aceitável trade-off vs. lock contention. Não é problema legal: numeração não precisa ser densa.

**Resposta da API:** retorna o boletim quando Fase C termina. Frontend mostra spinner durante B+C (típico 3-6s). Em caso de timeout, frontend mostra "boletim em geração" e oferece refresh.

## 6. Template do PDF (Boletim de Medição)

Layout em A4, baseado em padrão visual usado em construção civil brasileira. Apoio do skill `frontend-design` para a parte estética.

### Seções

1. **Cabeçalho** (topo de cada página)
   - Logo da empresa (esquerda)
   - "BOLETIM DE MEDIÇÃO Nº {numero}" (centro, destaque)
   - Data de emissão e período (direita)

2. **Identificação**
   - Empresa: razão social, CNPJ, endereço
   - Obra: nome do projeto, endereço da obra
   - Período de medição: dd/mm/aaaa a dd/mm/aaaa

3. **Tabela de medições**
   - Colunas: Item, Disciplina, Descrição, Qtd, Unidade, Valor Unit., Valor Total
   - Agrupamento visual por disciplina (subtotal por grupo)
   - Total geral em destaque ao final

4. **Resumo financeiro**
   - Subtotal por disciplina
   - Total geral em valor numérico e por extenso

5. **Bloco de assinaturas**
   - Linha "Engenheiro Responsável" — nome + CREA (se preenchido) + linha para assinatura
   - Linha "Aprovador" — espaço em branco para preenchimento manual
   - Linha "Cliente / Contratante" — espaço em branco

6. **Rodapé** (em cada página)
   - Numeração de página "X de Y"
   - "Documento gerado em {timestamp}"

### Stack técnica

- Template em React (TSX) renderizado server-side com `renderToStaticMarkup`.
- CSS de impressão (`@page A4`, `page-break`).
- Puppeteer com `printBackground: true`, formato A4, margens definidas.
- Fontes embutidas (não dependentes de CDN).

## 7. UX do Kanban de Medições

- Toggle Lista/Kanban no topo da seção.
- 4 colunas com contador e total financeiro por coluna (ex: "Em análise — 12 itens — R$ 45.300").
- Card mostra: descrição, disciplina (badge colorido), quantidade × valor unit, valor total em destaque.
- Multi-select via checkbox no canto do card.
- Botão flutuante "Exportar Boletim ({N} selecionadas)" aparece quando há seleção.
- Drag-and-drop entre colunas atualiza status; mover para "Paga" registra `paga_em = now()`.

## 8. UX do Branding da Empresa

Tela em "Configurações" → "Identidade da Empresa":

- Upload de logo (preview imediato, validação 2MB max, PNG/JPG)
- Razão social, CNPJ (com máscara), endereço (campos separados ou textarea)
- Telefone, e-mail
- Responsável técnico (nome obrigatório, CREA opcional)
- Botão "Salvar"
- Preview do cabeçalho do boletim atualiza ao vivo conforme campos preenchidos

## 9. UX dos Relatórios

Nova aba ou seção "Histórico de Boletins":

- Lista paginada de `boletim_exports`, mais recentes primeiro
- Filtros: por obra, por período (gerado entre X e Y), busca por número
- Cada linha: número, obra, período, total, gerado por, gerado em, [📄 PDF] [📊 CSV]
- "PDF" → re-download do snapshot original
- "CSV" → gera CSV das medições do snapshot (não dos dados atuais)
- Total consolidado dos boletins filtrados no rodapé da lista

## 10. Erros e edge cases

| Cenário | Comportamento |
|---------|---------------|
| Drag de medição falha por permissão | Reverte UI, toast |
| Export sem medições selecionadas | Botão de export desabilitado |
| Export com branding incompleto (sem CNPJ) | Bloqueia, redireciona para tela de branding com mensagem clara |
| Two exports concorrentes pegam números diferentes | Fase A com SELECT FOR UPDATE em companies — sequencial atômico |
| Puppeteer falha (timeout, OOM) | Fase B falha; boletim fica com status='gerando' → cron marca 'falhou' após 5min; usuário pode reexportar (novo número, gap aceito) |
| Storage falha após Puppeteer ok | Mesmo comportamento: status='gerando' → 'falhou' → reexport |
| Cliente perde conexão durante geração | Boletim continua sendo gerado server-side; tela de histórico mostra `status='pronto'` quando finaliza |
| Medição editada depois do export | Snapshot do boletim NÃO muda (audit trail preservado); medições atuais sim |
| Empresa sem logo | PDF sai sem logo, com nome da empresa em texto destacado no lugar |

## 11. Performance e custos

- Puppeteer no Vercel exige runtime serverless com Chromium (`@sparticuz/chromium` + `puppeteer-core`). Memória ~512MB. Tempo de geração esperado: 2-5s por boletim.
- Para volume baixo (estimado: <50 boletins/mês por empresa no MVP) isso é trivial. Se virar gargalo, mover pra worker dedicado depois.
- Snapshot JSONB de 100 medições ~30KB. Tabela cresce devagar.

## 12. Testes

- Unit: `numeracao.ts` — incremento atômico, isolamento por empresa.
- Unit: `useMedicoes` — transições de status corretas.
- Integration: gerar boletim end-to-end, validar PDF baixado tem o número correto e medições corretas.
- Integration: editar medição depois do export, re-baixar boletim, confirmar que valores são os do snapshot original.
- Visual regression: snapshot do PDF gerado contra fixture (validar que template não quebra).

## 13. Fora do escopo

- Aprovação digital com assinatura eletrônica (DocuSign / certificado ICP-Brasil). v2.
- Integração com sistemas financeiros (envio de NF, conciliação bancária). v2.
- Workflow multi-aprovadores (gerente + diretor). v2.
- Edição/cancelamento de boletim já gerado. (Política: gerar novo e marcar antigo como cancelado em v2.)
- Notificação por e-mail/WhatsApp ao gerar boletim. v2.

## 14. Critério de "pronto"

- [ ] Todas as migrations aplicadas em dev e produção.
- [ ] Toggle Lista/Kanban em medições funciona em desktop e mobile.
- [ ] Drag-and-drop persiste status; transições disparam timestamps corretos.
- [ ] Cadastro de branding salva e mostra preview do cabeçalho do boletim.
- [ ] Export gera PDF com qualidade visual de impressão.
- [ ] Numeração sequencial por empresa funciona sob concorrência.
- [ ] Snapshot é imutável; editar medição depois não afeta boletim já gerado.
- [ ] Tela de histórico permite re-download do PDF original.
- [ ] RLS bloqueia acesso a boletins de outras empresas.

## 15. Ordem de implementação sugerida

1. Migrations (status, branding, boletim_exports)
2. Cadastro de branding da empresa (Feature 4)
3. Status nas medições — apenas backend (campo + transitions via API)
4. Kanban de medições (UI)
5. Template do PDF + integração Puppeteer
6. Geração end-to-end do boletim (modal + API + storage)
7. Histórico de boletins (Feature 5)
8. Polimento visual + testes

Cada item é mergeable independentemente; usuário pode validar incrementalmente.
