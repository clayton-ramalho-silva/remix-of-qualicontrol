# Adicionar tags "Solicitado pela Gerenciadora" e "Solicitado pela Arquitetura Externa"

Replicar o padrão da tag existente `Solicitado pelo Cliente` em duas novas tags independentes: **Gerenciadora** e **Arquitetura Externa**. Elas aparecem nos mesmos lugares (formulário de novo desvio, edição no detalhe, badges na listagem/detalhe, filtros de relatório e badges/colunas no PDF).

## 1. Banco de dados (migration)

Em `desvios`, adicionar:
- `tag_solicitado_gerenciadora integer NOT NULL DEFAULT 0`
- `tag_solicitado_arquitetura integer NOT NULL DEFAULT 0`

(mesmo formato 0/1 usado nas outras tags — sem mudança de RLS).

## 2. Backend / camada de dados (`src/lib/trpc.ts`)

Espelhar o tratamento de `tagSolicitadoCliente` para as duas novas:
- `filters` em `desvios.list` → `tagSolicitadoGerenciadora`, `tagSolicitadoArquitetura`.
- `select` e KPIs em `desvios.stats` (incluir as colunas e contagem se quiser, mínimo: `select`).
- `create` (insert) → ler do input.
- Map de update (chave camelCase → snake_case).
- Mapper de retorno (`d.tag_solicitado_gerenciadora` → `tagSolicitadoGerenciadora`, idem arquitetura).

## 3. UI — Desvio

- **`src/pages/DesvioNovo.tsx`**: dois novos checkboxes ao lado do "Solicitado pelo Cliente" (com labels "Solicitado pela Gerenciadora" e "Solicitado pela Arquitetura Externa") + envio no insert.
- **`src/pages/DesvioDetalhe.tsx`**: dois states `editTagSolicitadoGerenciadora`/`editTagSolicitadoArquitetura`, dois checkboxes na edição, dois badges na visualização (cores distintas — ex.: roxo para Gerenciadora, âmbar para Arquitetura) e envio no update.
- **`src/pages/DesviosList.tsx`**: dois novos itens no `Select` de filtro por tag (`gerenciadora`, `arquitetura`) + dois novos badges na lista de cards.

## 4. UI — Relatório (`src/pages/Relatorio.tsx`)

- Dois novos states `tagGerenciadora` e `tagArquitetura` (sim/não/todos), dois novos `Select` na seção de filtros (logo abaixo de "Solic. Cliente").
- Enviar no `payload` para a edge function (`tagSolicitadoGerenciadora`, `tagSolicitadoArquitetura`).
- Renderização: incluir nos badges inline e nas colunas/listagens do PDF (com cores próprias).

## 5. Edge function `supabase/functions/gerar-relatorio/index.ts`

- Aceitar `tagSolicitadoGerenciadora` e `tagSolicitadoArquitetura` no body e aplicar `q.eq("tag_solicitado_gerenciadora", 1/0)` quando "sim"/"não".
- Incluir os dois campos no select (já é `select("*")`, então só repassar no `desviosOut` como `tagSolicitadoGerenciadora` / `tagSolicitadoArquitetura`).
- Adicionar duas colunas nas planilhas Excel (Sim/Não) na aba "Desvios".

## Cores sugeridas (badges)

- **Gerenciadora** → roxo (`bg-purple-100 text-purple-700`)
- **Arquitetura Externa** → âmbar (`bg-amber-100 text-amber-700`)

(mantendo Cliente em azul, Crítico em vermelho, Segurança em laranja já existente).

## Fora de escopo

- Não mexer em `assistente-ia` nem em filtros de outras telas além das listadas.
- Sem migração de dados antiga (campos novos começam todos em 0).
