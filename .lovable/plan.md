# Ajustes de UX — Novo Desvio

## 1. Mostrar planta automaticamente quando só há 1 andar e 1 planta

**Onde:** `src/components/PlantaPinSelector.tsx`

Hoje o usuário precisa clicar em "Marcar na Planta" e selecionar Edifício → Andar → Planta manualmente. Quando a obra só tem uma combinação possível, vamos pré-selecionar e já abrir a imagem.

- Adicionar um `useEffect` que, quando `edificios` e `plantas` carregarem:
  - Se houver exatamente 1 edifício, setar `edificioId` automaticamente.
  - Se esse edifício tiver exatamente 1 andar, setar `andarId`.
  - Se houver exatamente 1 planta nesse andar (ou exatamente 1 planta legada sem andar quando não há edifícios), chamar `onChange({ plantaId, pinX:null, pinY:null })` e `setShowPlanta(true)`.
- Só executa quando `plantaId` ainda está `null` (não sobrescreve escolha do usuário).

## 2. Permitir "Concluir Inspeção" salvando o desvio atual

**Onde:** `src/pages/DesvioNovo.tsx` (botões da Etapa 2)

Problema: o botão "Concluir Inspeção" hoje só está habilitado quando já existem desvios registrados, e ele apenas redireciona — descarta o desvio atual em edição. Se o usuário só quer registrar 1 desvio, é forçado a clicar em "Salvar e Continuar".

Mudança:
- Renomear/ajustar o botão para **"Salvar e Concluir"**.
- Habilitar sempre que `descricao` + `grupoId` estiverem preenchidos (mesmas regras de `salvarDesvio`), ou quando já houver `registrados.length > 0`.
- Comportamento ao clicar:
  - Se há campos preenchidos no form atual → chama `salvarDesvio(false)` (que já salva e redireciona para `/desvios`).
  - Se não há nada preenchido e já existem registrados → apenas redireciona com toast de conclusão.
- Manter "Salvar e Continuar" como ação secundária.

## 3. Qualidade da transcrição de áudio

**Onde:** `supabase/functions/transcrever-audio/index.ts` e `src/components/VoiceRecorderButton.tsx`

Suspeitas pelo código atual:
- O mapeamento `format` é frágil: `mimeType.includes("mp4") ? "mp4" : "webm"`. No iOS/Safari o blob vem como `audio/mp4` mas o codec real é `aac`; alguns providers exigem `format: "mp3"` ou `"wav"`.
- Etapa 2 (limpeza) usa `gemini-2.5-flash-lite`, que às vezes "reescreve" demais e altera o conteúdo técnico, dando a sensação de "transcrição errada".
- Áudios longos em `webm/opus` podem chegar truncados na ponta do gateway.

Ações:
- Trocar a transcrição para `google/gemini-2.5-pro` (mais robusto para multimodal de áudio) e ajustar o `format` para o mime real (`webm` / `mp4` / `wav` / `ogg`) com fallback explícito.
- Pular a etapa de "limpeza" por padrão (ou usar `gemini-2.5-flash` apenas para pontuação, com prompt mais restritivo "NÃO altere palavras, apenas adicione pontuação"). Adicionar flag para desativar facilmente.
- No client (`VoiceRecorderButton.tsx`), priorizar `audio/webm;codecs=opus` e enviar bitrate explícito (`audioBitsPerSecond: 64000`) para reduzir ruído de codec. Garantir `mimeType` enviado bate com o real do `MediaRecorder`.
- Logar no edge function o tamanho do base64 recebido e o `format` final para facilitar debug.

## 4. Data "Identificado em" pegando dia anterior

**Onde:** `src/pages/DesvioNovo.tsx` linha 146 (e 147 para `prazoSugerido`)

Causa: `new Date("2026-05-11").getTime()` é interpretado como **UTC 00:00**, e em fuso BR (UTC-3) vira `10/05 21:00`. Ao formatar com `toLocaleDateString` no detalhe, mostra 10/05.

Fix:
- Criar helper `localDateMs(yyyyMmDd)` que faz `const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d, 12, 0, 0).getTime();` (meio-dia local, imune a DST/fuso).
- Aplicar em `dataIdentificacao` e `prazoSugerido` no `salvarDesvio`.
- Mesma correção em qualquer outro `new Date(<input type=date>)` da página.

> O desvio 11 já existente continuará com a data errada no banco; o fix vale para novos. Se desejar, posso adicionar uma migration para corrigir registros antigos por `data_identificacao`, mas isso fica fora deste escopo a menos que você peça.

## Detalhes técnicos

- Nenhuma mudança de schema/migration.
- Edge function `transcrever-audio` será redeployada automaticamente.
- Sem alterações em rotas, auth ou RLS.
