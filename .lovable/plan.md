# Acelerar "Tirar foto + Salvar desvio"

## Diagnóstico

Fluxo atual em `src/pages/DesvioNovo.tsx` + `src/lib/trpc.ts` (`desvios.create`):

1. Usuário tira foto → `URL.createObjectURL(file)` cria preview, mas o **arquivo bruto da câmera (3–8 MB, ~4000×3000)** fica em memória.
2. Ao clicar "Salvar":
   - `desvios.create` faz `INSERT … .select().single()` (1 round-trip).
   - **Depois** disso, para cada foto: `supabase.storage.from('evidencias').upload(file)` com o arquivo bruto.
   - Depois `INSERT` em `fotos_evidencia`.
   - Só então a UI libera.
3. Em rede móvel típica (1–3 Mbps upload), 3 fotos de 5 MB = ~40s. Esse é o gargalo dominante, **não** o banco.

Causas raiz, em ordem de impacto:

| # | Causa | Impacto |
|---|---|---|
| 1 | Upload do JPEG cru da câmera, sem compressão | ~95% do tempo |
| 2 | Uploads só começam *depois* do clique em Salvar | ~3–5s perdidos |
| 3 | Insert do desvio espera todos os uploads antes de fechar a UX | bloqueio percebido |
| 4 | `INSERT … select().single()` round-trip extra | ~100–300 ms |

## Solução

Quatro frentes, todas frontend (sem mudar schema/edge function).

### 1. Compressão client-side antes de subir (maior ganho)

Reduzir cada foto para no máx. 1600 px no lado maior, JPEG qualidade 0.8, antes de qualquer upload. 5 MB → ~250 KB (~20× menor). Mantém qualidade visual para evidência de obra.

- Novo util `src/lib/image-compress.ts` usando `createImageBitmap` + `OffscreenCanvas` (fallback `<canvas>`), saída `Blob` JPEG.
- Aplicar em `handleFileChange` de `DesvioNovo.tsx` e também em `RespostaFotosUploader.tsx` (vistoria) para consistência.

### 2. Pré-upload no momento da seleção da foto

Assim que o usuário escolhe/tira a foto, já fazemos upload para o bucket `evidencias` numa pasta temporária (`tmp/<uuid>/...`) **em paralelo** com o restante do preenchimento. Ao salvar o desvio, só linkamos a `file_key` já existente.

- Estado da foto vira `{ file, preview, fileKey?, status: 'uploading'|'done'|'error' }`.
- Pequeno spinner em cima da thumb enquanto sobe.
- Botão "Salvar" desabilita só se houver foto ainda `uploading` (raro, pois já vai estar pronta).

Resultado: no clique "Salvar", o que falta é só o `INSERT` do desvio + `INSERT` das linhas em `fotos_evidencia` → tipicamente <500 ms.

### 3. Salvamento otimista + histórico em background

- `createDesvio.mutateAsync` continua, mas o `INSERT` em `fotos_evidencia` e o `historico` viram fire-and-forget (já é o caso do histórico). Toast de sucesso e reset do form acontecem imediatamente após o insert do desvio.
- Manter retry silencioso se o insert das fotos falhar (raro pois o upload já passou).

### 4. Limpeza de pequenas latências

- Cachear `supabase.auth.getUser()` uma vez por sessão da página (já temos o user no contexto via `useAuth`) em vez de chamar dentro de `desvios.create`.
- Continuar usando `.select().single()` (precisamos do id) — mas só esse round-trip permanece bloqueante.

## Detalhes técnicos

```text
Antes:                       Depois:
[click Salvar]               [escolher foto]
  └ INSERT desvio (~300ms)     └ comprime (50ms) + upload bg (~400ms p/ 250KB)
  └ upload foto 1 (~12s)     [click Salvar]
  └ upload foto 2 (~12s)       └ INSERT desvio (~300ms)
  └ INSERT fotos (~200ms)      └ INSERT fotos_evidencia (~200ms)  → fecha
  └ fecha                      └ historico fire-and-forget
Total: ~25s p/ 2 fotos       Total percebido: ~500ms
```

Arquivos a tocar:
- `src/lib/image-compress.ts` (novo)
- `src/pages/DesvioNovo.tsx` (handleFileChange, salvarDesvio, tipo Foto, UI da thumb)
- `src/components/RespostaFotosUploader.tsx` (aplicar compressão no `handleFiles`)
- `src/lib/trpc.ts` → opcional: remover `getUser()` interno de `desvios.create` aceitando `createdById/Name` do cliente para economizar 1 chamada.

Sem mudança de schema, sem edge function, sem migração.

## Fora de escopo

- Conversão para WebP (ganho marginal vs. JPEG já comprimido; alguns iOS antigos perdem suporte).
- Upload chunked/resumable — não necessário com fotos de ~250 KB.
- Service Worker / fila offline — pode vir depois se necessário.
