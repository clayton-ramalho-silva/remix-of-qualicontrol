## Objetivo

Impedir perda de dados em formulários longos (vistoria de recebimento, QSMS – lista de verificação, ocorrências) quando o navegador recarrega — por exemplo, ao girar o tablet ou trocar de aba. Garantir que o usuário recupere o rascunho automaticamente ao reentrar e que nada seja perdido enquanto preenche.

## Formulários afetados

1. **Vistoria de recebimento** → tabela `checklist_entregas` (+ `checklist_entrega_itens`, `checklist_entrega_fotos`)
2. **QSMS / Vistoria – Lista de verificação** → tabela `verificacoes` (+ `verificacao_respostas`, `verificacao_resposta_fotos`)
3. **Ocorrências (Investigação/Checklist)** → tabela `ocorrencias` (+ tabelas relacionadas: causas, comissão, cronologia, fotos, porquês, testemunhas, documentos)

## Mudanças

### 1. Camada de auto-save em localStorage (frontend)

- Novo hook `useDraftAutosave({ key, data, enabled })` em `src/hooks/useDraftAutosave.ts`:
  - Debounce de ~600 ms para gravar `JSON.stringify(data)` em `localStorage`.
  - `key` no formato: `draft:vistoria:{obra_id}:{data_vistoria}:{categoria}`, `draft:entrega:{obra_id}:{data_vistoria}`, `draft:ocorrencia:{obra_id}:{data_ocorrencia}:{hora}`.
  - Helpers: `loadDraft(key)`, `clearDraft(key)`, `listDrafts(prefix)`.
  - Listener `beforeunload` registrado enquanto houver dirty flag (mostra aviso nativo do navegador).
- Cada um dos 3 formulários:
  - No mount, checa se existe rascunho na chave correspondente. Se existir e for diferente do estado inicial: mostra `toast.success("Rascunho recuperado")` e popula o estado.
  - Apaga o rascunho local quando a finalização (status = finalizado) for confirmada pelo backend.

### 2. Salvamento parcial no backend (status = rascunho)

- Migration adicionando coluna `status text not null default 'finalizado'` em:
  - `verificacoes` (valores: `rascunho`, `finalizado`)
  - `checklist_entregas` (mesmos valores)
  - `ocorrencias` já possui `status` próprio (`comunicado`/etc.); para esse formulário usamos um campo separado `is_rascunho integer not null default 0` para não conflitar com o fluxo existente.
- Botão **"Salvar parcial"** em cada formulário:
  - Na primeira chamada: faz `INSERT` do registro principal já com status rascunho e devolve o `id`.
  - Nas chamadas seguintes: faz `UPDATE` (e upserts em filhos: respostas, fotos, itens) usando o `id` retornado.
  - O `id` é mantido em estado React e também persistido no rascunho de localStorage, para sobreviver a reload.
- Sem `navigate()` automático nem reload — o usuário continua na tela, com toast "Rascunho salvo".

### 3. Listas escondem rascunhos por padrão

- `src/pages/Vistorias.tsx` (e equivalentes para checklist de entrega e ocorrências):
  - Filtro padrão `status = 'finalizado'` (ou `is_rascunho = 0` para ocorrências).
  - Toggle "Mostrar rascunhos" para o usuário ver os parciais e retomá-los.
  - Botão "Continuar" abre o formulário com o `id` existente, populando do banco.

### 4. Aviso `beforeunload`

- Centralizado no hook acima: `window.addEventListener("beforeunload", ...)` só enquanto `dirty === true`. Removido após salvar/finalizar.

### 5. Limpeza de fotos órfãs no Storage (não bloqueante)

- Tabela `storage_orphans` (id, bucket, file_key, detected_at, deleted_at nullable) — apenas registro/auditoria.
- Edge function agendada `cleanup-orphan-photos` (a princípio sem cron — manual; o cron pode ser ativado depois):
  - Lista objetos dos buckets `evidencias` e `plantas`.
  - Para cada arquivo, verifica se há referência em `fotos_evidencia`, `checklist_entrega_fotos`, `ocorrencia_fotos`, `ocorrencia_documentos`, `verificacao_resposta_fotos`, `plantas`.
  - Se não houver e o arquivo tiver mais de 24h, insere em `storage_orphans` (apenas marca; não deleta nesta fase).
  - Logs de quantos arquivos foram marcados.

## Fora de escopo (proposto para depois)

- Cron real do `pg_cron` para a limpeza — fica disponível como função manual; podemos agendar depois quando estiver validado.
- Deleção efetiva dos órfãos — primeiro só marcamos; eventual purge fica como ação manual no painel admin.
- Sincronização entre abas (BroadcastChannel) — pode entrar numa iteração futura se houver demanda.

## Ordem de execução

1. Migration (status em `verificacoes`, `checklist_entregas`; `is_rascunho` em `ocorrencias`; tabela `storage_orphans`) → pedir aprovação.
2. Hook `useDraftAutosave` + helpers.
3. Refatorar os 3 formulários para usar autosave + Salvar parcial.
4. Filtrar rascunhos nas listas + adicionar toggle "Mostrar rascunhos".
5. Edge function `cleanup-orphan-photos`.

## Detalhes técnicos

- localStorage tem ~5 MB por origem. Fotos NÃO são salvas no rascunho local — apenas metadados (url já enviada ao Storage, descrição, ordem). Upload de foto continua acontecendo direto no Storage como hoje, então mesmo reload não perde a foto em si.
- Cada upload de foto registra a `file_key` num array em estado e também no rascunho. Na finalização, esses keys viram linhas em `*_fotos`. Se o usuário abandonar, as keys ficam órfãs e serão marcadas pelo cleanup.
- `useDraftAutosave` ignora campos do tipo `File`/`Blob` para evitar erro de serialização.
- Compatibilidade com registros antigos: default `'finalizado'` em `status` garante que vistorias já criadas continuem visíveis sem migração de dados.
