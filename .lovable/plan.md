# Backfill: aplicar a nova regra de automação aos desvios existentes

## O que farei

Aplicar a mesma regra que agora roda no upload, mas retroativamente nos desvios que já estão no banco.

## Diagnóstico atual

Consultei a base e encontrei:

- **144 desvios** com status `aberto` que já têm pelo menos 1 foto de **abertura** → devem ir para `em_andamento`.
- **0 desvios** com status `em_andamento` que já têm foto de **fechamento** → nada a migrar para `aguardando_aceite`.

Ou seja, na prática só a transição abertura → em_andamento será aplicada agora.

## Operação

Em uma única operação de update no banco:

1. `UPDATE desvios SET status='em_andamento' WHERE deleted_at IS NULL AND status='aberto' AND EXISTS (foto de abertura)`
2. Para cada desvio alterado, inserir um registro em `historico` com `tipo='status'`, `de='aberto'`, `para='em_andamento'`, descrição "Status ajustado em massa pela nova regra de automação (1ª foto de abertura)".

Sem `user_id` (operação do sistema). Não toco em desvios `fechado`, `aguardando_aceite` ou excluídos. Não rebaixa nada.

## Fora de escopo

- Não altero nenhum código (a automação on-upload já está ativa).
- Não envio notificações para usuários sobre a mudança em massa.

Confirma e eu executo.
