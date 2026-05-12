## 1. Menu "Aprovações" agrupado na sidebar

Em `src/components/DashboardLayout.tsx`, transformar os dois itens soltos:
- `Aprov. Gerenciadora` → `/aprovacoes/gerenciadora`
- `Aprov. Arquitetura` → `/aprovacoes/arquitetura`

…em **um único grupo expansível "Aprovações"** (ícone `ShieldCheck`), seguindo o mesmo padrão dos outros grupos colapsáveis já existentes na sidebar. Itens filhos: "Gerenciadora" e "Arquitetura Externa". O grupo abre automaticamente quando a rota ativa for uma das duas. Quando a sidebar estiver no modo `collapsed` (icon-only), o grupo continua acessível via ícone.

## 2. Coluna "Aprovações" no Índice do Relatório

Em `src/pages/Relatorio.tsx`, a coluna no índice ainda não existe — só o bloco no detalhamento. Adicionar:

**PDF (HTML gerado, ~linha 196-217):**
- Novo `thAprov` condicional a `cfg.mostrarAprovacoes !== false`, posicionado após Status.
- Em cada linha (`rows`), nova `<td>` com badges compactos por aprovação registrada:
  - `G✓` / `G✗` (Gerenciadora aprovado/reprovado)
  - `A✓` / `A✗` (Arquitetura aprovado/reprovado)
  - Verde para aprovado, vermelho para reprovado, cinza/traço quando não há aprovação
- Tooltip não funciona em PDF, então o detalhamento (já existente) continua mostrando nome do aprovador e comentário.

**Preview UI (~linha 878-887 + linhas do tbody):**
- Espelhar a mesma coluna condicional na tabela React, com `Badge` do shadcn (variantes verde/vermelho).
- Usar mesma lógica: iterar `d.aprovacoes` e exibir 1 badge por registro.

**Quando agrupado por ambiente:** a coluna entra no mesmo `tableHead` reutilizado, então cobre os dois modos automaticamente.

## Arquivos afetados

- `src/components/DashboardLayout.tsx` — agrupar menu Aprovações
- `src/pages/Relatorio.tsx` — adicionar coluna Aprovações no índice (PDF + preview)

Nenhuma mudança de DB, edge function ou hooks. Os dados `d.aprovacoes` já chegam do backend.
