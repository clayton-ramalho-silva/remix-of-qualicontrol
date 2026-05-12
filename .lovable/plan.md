## Objetivo

Garantir que um desvio só possa transitar para **Fechado** quando todas as aprovações exigidas pelas tags de classificação estiverem registradas como `aprovado`:

- Se `tag_solicitado_gerenciadora = 1` → exige `desvio_aprovacoes` com `tipo='gerenciadora'` e `decisao='aprovado'`.
- Se `tag_solicitado_arquitetura = 1` → exige `desvio_aprovacoes` com `tipo='arquitetura'` e `decisao='aprovado'`.

Hoje o `handleStatusChange` em `src/pages/DesvioDetalhe.tsx` só valida fotos de fechamento; o resolver `desvios.update` em `src/lib/trpc.ts` não consulta `desvio_aprovacoes`.

## Mudanças

### 1. Backend — `src/lib/trpc.ts`

**`desvios.getById`** (linhas ~100-126): adicionar carregamento de aprovações.

```ts
supabase.from("desvio_aprovacoes").select("*").eq("desvio_id", id).order("created_at"),
```

Retornar `aprovacoes` no objeto, com campos camelCase (`aprovadorNome`, `createdAt` etc.).

**`desvios.update`** (linha ~638): antes de aplicar `patch`, se `rest.status === "fechado"`:

1. Buscar o desvio atual (`tag_solicitado_gerenciadora`, `tag_solicitado_arquitetura`).
2. Buscar `desvio_aprovacoes` do desvio.
3. Se `tag_solicitado_gerenciadora=1` e não houver registro `tipo='gerenciadora'` com `decisao='aprovado'` → `throw new Error("Aprovação da Gerenciadora pendente — não é possível fechar.")`.
4. Mesma checagem para `arquitetura`.

Isso protege também atualizações vindas de outros caminhos (não só do detalhe).

### 2. Frontend — `src/pages/DesvioDetalhe.tsx`

- Consumir `data.aprovacoes` retornado pelo `getById`.
- Em `handleStatusChange`, antes do `mutate`, replicar a mesma checagem para falhar cedo com `toast.error` claro indicando qual aprovação está pendente.
- Ajustar o seletor de status: quando faltar aprovação requerida, exibir o item "Fechado" desabilitado (ou marcado como pendente) com tooltip indicando o motivo.
- Adicionar um pequeno bloco visível no topo da página (próximo às tags) listando o status das aprovações exigidas:
  - "Gerenciadora: aguardando" / "aprovado" / "reprovado"
  - "Arquitetura: aguardando" / "aprovado" / "reprovado"

A página `/aprovacoes/...` continua sendo o lugar onde o aprovador realmente registra a aprovação — apenas adicionamos um link/atalho a partir do detalhe.

### 3. Observação sobre status `aguardando_aceite`

Mantemos a regra atual (só exige fotos de fechamento). A trava só atua na transição para `fechado`.

## Arquivos editados

- `src/lib/trpc.ts`
- `src/pages/DesvioDetalhe.tsx`
