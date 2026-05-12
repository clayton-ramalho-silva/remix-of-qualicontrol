## Objetivo

Migrar a exclusão de desvios para **soft delete**: marcar `deleted_at` em vez de remover. Aprovações, fotos, planos e histórico ficam preservados; "Aprovações recentes" continua funcionando e o desvio referenciado segue acessível como **somente leitura** com aviso de "Desvio excluído".

Como tarefa pontual, **excluir definitivamente o desvio #153** (foi um teste).

## Mudanças

### 1. Schema — migração

```sql
ALTER TABLE public.desvios
  ADD COLUMN deleted_at timestamptz NULL,
  ADD COLUMN deleted_by_id uuid NULL,
  ADD COLUMN deleted_by_name text NULL;

CREATE INDEX desvios_deleted_at_idx ON public.desvios (deleted_at);
```

(Sem alterações de RLS; o filtro fica no código.)

### 2. Limpeza pontual — #153

Em uma migração separada (ou via insert tool), executar a exclusão real em cascata só do #153:

```sql
DELETE FROM public.plano_desvios     WHERE desvio_id = 153;
DELETE FROM public.fotos_evidencia   WHERE desvio_id = 153;
DELETE FROM public.desvio_aprovacoes WHERE desvio_id = 153;
DELETE FROM public.historico         WHERE desvio_id = 153;
DELETE FROM public.planos_acao       WHERE desvio_id = 153;
DELETE FROM public.desvios           WHERE id        = 153;
```

### 3. Backend — `src/lib/trpc.ts`

**`desvios.delete` (~linha 705):** trocar todos os `delete` em cascata por:
```ts
await supabase.from("desvios")
  .update({ deleted_at: new Date().toISOString(), deleted_by_id: ctx.userId, deleted_by_name: ctx.userName })
  .eq("id", id);
```
Manter o gate de admin que já existe.

**Filtrar `deleted_at IS NULL`** em todas as queries que listam desvios para uso operacional:
- `desvios.list` (~86)
- `desvios.kpis`/agregados (~45, ~295, ~365)
- `desvios.update` (~687) — bloquear update se `deleted_at IS NOT NULL`
- Joins em `getPlanoById` (~472, ~501)

**`desvios.getById` (~100):** **NÃO** filtrar — continua retornando o desvio mesmo se `deleted_at` estiver preenchido, mas devolver o campo `deletedAt` para o frontend exibir o aviso e bloquear ações.

**Adicionar `desvios.restore`** (admin-only): zera `deleted_at` para reverter.

### 4. Frontend

**`src/pages/DesviosList.tsx`:** lista já vem filtrada do backend — nada a fazer além de checar se há outros usos.

**`src/pages/DesvioDetalhe.tsx`:** se `data.deletedAt` estiver preenchido:
- Mostrar banner amarelo no topo: "Este desvio foi excluído em {data} por {nome}".
- Desabilitar todos os botões de ação (status, edição, fotos, planos).
- Para admin, mostrar botão "Restaurar" que chama `desvios.restore`.

**`src/pages/Aprovacoes.tsx`** (e demais consumidores em `Obras.tsx`, `Alocacao.tsx`, `Fornecedores.tsx`, `ChecklistEditor.tsx`, `FotosDesvioPicker.tsx`): adicionar `.is("deleted_at", null)` em consultas diretas a `desvios`. Em "Aprovações recentes", como o backend de leitura é direto na tabela `desvio_aprovacoes`, ela já não some — quando o usuário clicar para abrir o desvio, cai em `DesvioDetalhe` que mostra o banner de excluído.

## Arquivos editados

- nova migração SQL (colunas `deleted_at`, `deleted_by_*`, índice)
- nova migração SQL (delete real do #153)
- `src/lib/trpc.ts` (resolver `desvios.delete`, `desvios.restore`, filtros `deleted_at IS NULL`)
- `src/pages/DesvioDetalhe.tsx` (banner + bloqueio de ações + botão restaurar)
- `src/pages/Aprovacoes.tsx`, `src/pages/Obras.tsx`, `src/pages/Alocacao.tsx`, `src/pages/Fornecedores.tsx`, `src/pages/ChecklistEditor.tsx`, `src/components/checklist/FotosDesvioPicker.tsx` (filtros `.is("deleted_at", null)`)
