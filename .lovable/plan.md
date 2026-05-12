## Objetivo

Tornar **Vistoria** uma vertical de primeira classe em todo o sistema, ao lado de Qualidade, Checklist e QSMS. Hoje ela só existe em alguns pontos (sidebar, VerticalContext, rotas `/vistoria-recebimento`), mas está ausente de filtros, selects de Origem, cobertura de obras, alocação, planos de ação, relatórios, administração e Home.

## Mudanças no banco

1. Adicionar valor `vistoria` ao enum `origem_desvio` (usado também pelas colunas `vertical` de `alocacoes` e `planos_acao`).
2. Adicionar coluna `cobertura_vistoria integer NOT NULL DEFAULT 0` em `obras`.

Nenhuma RLS muda. Todas as tabelas afetadas já têm policy `auth all`.

## Mudanças de código (frontend)

Incluir `vistoria` em todos os pontos onde hoje só aparecem qualidade/checklist/qsms:

**Desvios (Origem)**
- `src/pages/DesvioNovo.tsx` — adicionar `<SelectItem value="vistoria">Vistoria</SelectItem>` e atualizar tipo do `useState`.
- `src/pages/DesvioDetalhe.tsx` — mesmo SelectItem no editor de Origem.
- `src/pages/DesviosList.tsx` — opção no filtro de Origem.

**Relatório**
- `src/pages/Relatorio.tsx` — adicionar checkbox "Vistoria" no card "Origem dos Desvios" (`origemVistoria`), incluir no array `origens` enviado ao backend, e no mapa `oLabels` para o cabeçalho do PDF.

**Planos de Ação**
- `src/pages/PlanosAcao.tsx` — opção `vistoria` no filtro de vertical.
- `src/pages/PlanoAcaoNovo.tsx` — opção `vistoria` no select de vertical.

**Obras / Cobertura**
- `src/pages/Obras.tsx` — incluir entrada `{ key: "vistoria", label: "Vistoria", icon: ClipboardCheck, coverCol: "cobertura_vistoria", color: "text-emerald-600" }` no array `verticais` e ampliar o tipo `Vertical`.
- `src/pages/Alocacao.tsx` — mesma adição no array de verticais e tipo, mais o ramo correspondente em `if (vertical === "vistoria")` ao calcular cobertura/alocações.

**Home**
- `src/pages/Home.tsx` — adicionar 4º card de vertical "Vistoria" (mesmo padrão dos demais), apontando para `/vistoria-recebimento`.

**Administração**
- `src/pages/Administracao.tsx` — adicionar `{ id: "vistoria", label: "Vistoria" }` na lista de categorias para configuração de seções/itens de checklist e faixas.

**Backend lib**
- `src/lib/trpc.ts` — incluir `vistoria: 0` no objeto `porOrigem` (linha ~319) para que a contagem por origem nos relatórios/dashboards inclua Vistoria.

## Notas

- O VerticalContext, VerticalSwitcher e a sidebar já contemplam `vistoria` — não precisam mudar.
- As rotas `/vistoria-recebimento` continuam sendo a área operacional da vertical; as novas opções apenas permitem classificar/filtrar desvios, planos, alocações e cobertura por essa vertical.
- A migration do enum precisa ser commitada antes do uso nos selects (Postgres exige ADD VALUE em transação separada — será feito em migration própria).

## Arquivos editados

`supabase/migrations/<novo>.sql`, `src/pages/DesvioNovo.tsx`, `src/pages/DesvioDetalhe.tsx`, `src/pages/DesviosList.tsx`, `src/pages/Relatorio.tsx`, `src/pages/PlanosAcao.tsx`, `src/pages/PlanoAcaoNovo.tsx`, `src/pages/Obras.tsx`, `src/pages/Alocacao.tsx`, `src/pages/Home.tsx`, `src/pages/Administracao.tsx`, `src/lib/trpc.ts`.
