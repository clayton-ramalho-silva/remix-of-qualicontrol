# Welcome to your Lovable project

## Sincronização de Obras

Este projeto agora suporta sincronização externa de `obras` via API do cliente.

### Como funciona

- `supabase/functions/sync-obras/index.ts`: Edge Function que consulta o endpoint externo e atualiza a tabela `obras` no Supabase.
- `scripts/sync-obras.sh`: script de shell para ser chamado por um cron job no servidor.

### Variáveis de ambiente

- `AW_API_KEY` - chave para o gateway externo do cliente.
- `AW_API_URL` - URL da API externa (padrão: `https://gateway.athiewohnrath.com.br/aw-api-hub/check-busca-projeto`).
- `SUPABASE_URL` - URL do projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` - chave de serviço para escrita no banco.
- `SYNC_OBRAS_SECRET` - segredo obrigatório para proteger a função HTTP.
- `SYNC_OBRAS_ENDPOINT` - URL pública da função `sync-obras` para o cron.

### Agendamento sugerido

No servidor, execute algo como:

```bash
SYNC_OBRAS_ENDPOINT="https://<project>.supabase.co/functions/v1/sync-obras" \
SYNC_OBRAS_SECRET="<segredo>" \
./scripts/sync-obras.sh
```

Isso garante que a tabela `obras` seja atualizada diariamente a partir da API externa.
