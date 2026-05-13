# Automação de status do desvio por upload de fotos

## Objetivo

Tirar do usuário a tarefa manual de mudar o status do desvio. O sistema passa a reagir automaticamente ao upload de fotos:

- 1ª foto de **abertura** (evidência inicial) enviada → desvio passa de `aberto` para `em_andamento`.
- 1ª foto de **fechamento** enviada → desvio passa de `em_andamento` para `aguardando_aceite` (status atual no banco que representa "aguardando cliente / aceite final").

Tudo continua respeitando as regras de aprovação que já existem hoje (gerenciadora/arquitetura).

## Observação importante sobre nomenclatura

Hoje o enum `status_desvio` no banco tem 4 valores: `aberto`, `em_andamento`, `fechado`, `aguardando_aceite`. Não existe `aguardando_cliente`. Vou tratar o que você chamou de "aguardando_cliente" como o mesmo `aguardando_aceite` já existente, que é exatamente a etapa de validação final pelo cliente. Se preferir renomear o rótulo na UI para "Aguardando Cliente", faço isso junto sem mexer no enum.

## Regras de transição

```text
estado atual          gatilho                              novo estado
--------------------  -----------------------------------  ---------------------
aberto                upload da 1ª foto tipo=abertura      em_andamento
em_andamento          upload da 1ª foto tipo=fechamento    aguardando_aceite
qualquer outro        (sem efeito)                          (mantém)
```

Condições e proteções:

- A automação só dispara se for **realmente a primeira** foto daquele tipo no desvio (contagem prévia em `fotos_evidencia` filtrada por `desvio_id` + `tipo`).
- A transição para `aguardando_aceite` só ocorre se as aprovações pendentes (`tag_solicitado_gerenciadora` / `tag_solicitado_arquitetura`) já estiverem `aprovado` em `desvio_aprovacoes`. Se ainda houver aprovação pendente, a foto de fechamento sobe normalmente, mas o status permanece `em_andamento` (igual à regra atual de bloqueio de fechamento).
- Não rebaixa status: se o desvio já está em `fechado`, nada acontece.
- A mudança automática gera um registro em `historico` (tipo `status`, com `de`/`para`) para rastreabilidade, marcado como ação automática ("Status alterado automaticamente após 1ª foto de abertura/fechamento").

## Onde implementar

Centralizo a lógica no único ponto onde fotos são criadas via app: `fotos.upload` em `src/lib/trpc.ts` (linhas ~848-873). Ali, depois do `insert` em `fotos_evidencia` e antes do retorno:

1. Conta fotos existentes do mesmo `tipo` para o `desvio_id` (excluindo a recém-criada → contar antes do insert ou usar `count` e comparar com 1).
2. Lê o desvio (`status` e tags de aprovação).
3. Aplica a tabela de transição acima.
4. Se houver mudança: `update` em `desvios.status`, `insert` em `historico`.

Isso cobre automaticamente todos os pontos do app que sobem foto (DesvioNovo, DesvioDetalhe, etc.), porque todos passam por esse handler. O `RespostaFotosUploader` (vistorias) e `FotosDesvioPicker` (checklists) **não** afetam o status do desvio — eles operam em outro fluxo.

## UI

- Na tela do desvio (`src/pages/DesvioDetalhe.tsx`), depois do upload, dar refetch do desvio para o badge de status atualizar sozinho (já é o padrão lá).
- Pequeno toast "Status atualizado para Em Andamento" / "Status atualizado para Aguardando Aceite" quando a transição automática ocorrer (o handler retorna a info; a página exibe).

## Fora de escopo

- Não mexo no enum do banco nem crio `aguardando_cliente` novo.
- Não altero o fluxo de aprovações gerenciadora/arquitetura.
- Não toco nos uploads de checklist/vistoria.

Confirma se posso usar `aguardando_aceite` (apenas com rótulo "Aguardando Cliente" na UI, se quiser) e eu sigo com a implementação.
