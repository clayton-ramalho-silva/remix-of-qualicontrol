# Editor de anotações em fotos

Permitir que o usuário desenhe **setas, círculos, retângulos e texto** sobre as fotos de evidência do desvio — útil para destacar exatamente o problema na imagem.

## UX

Em cada foto (na tela de novo desvio e no detalhe do desvio) aparece um botão **"Anotar"** sobre a miniatura. Ao clicar, abre um dialog em tela cheia com:

- **Canvas** com a foto carregada.
- **Toolbar superior** com ferramentas: Seta, Retângulo, Círculo, Texto, Borracha (apagar última), Limpar tudo.
- **Seletor de cor** (vermelho, amarelo, verde, azul, preto, branco) e **espessura** (fina/média/grossa).
- Botões **Cancelar** e **Salvar**.

Ao salvar:
- O canvas é exportado como JPEG (qualidade 0.85) — as marcações ficam "queimadas" na imagem.
- A imagem anotada **substitui** a original no storage (mesmo `file_key`, sobrescrevendo). A original "limpa" é descartada.
- A miniatura na tela atualiza.

Em mobile o dialog é fullscreen e os controles ficam no rodapé para caber bem com toque.

## Ferramentas — detalhes

- **Seta**: clique no início, arraste até o fim, solta → desenha linha + ponta de seta.
- **Retângulo/Círculo**: clique e arraste para definir as dimensões.
- **Texto**: clique no ponto → abre input → digita → ENTER fixa o texto.
- Cada forma adicionada vira um "objeto" na lista interna (permite desfazer a última).
- Sem multi-toque/edição posterior por enquanto — depois de fixar, só "Desfazer" última ou "Limpar tudo".

## Onde mexer

- **Novo** `src/components/PhotoAnnotator.tsx` — componente do editor (dialog + canvas + toolbar). Implementação em canvas 2D puro (sem libs novas), com estado de "shapes" para suportar undo.
- **Novo** `src/lib/photo-annotate.ts` — utilitários: desenhar seta, retângulo, círculo, texto, exportar canvas para Blob.
- `src/components/RespostaFotosUploader.tsx` — adicionar botão "Anotar" em cada thumbnail; ao salvar, substitui o `File`/preview local antes do upload.
- `src/pages/DesvioNovo.tsx` — adicionar botão "Anotar" em cada foto antes do upload (atualiza o `File` local e re-faz o upload se já subiu).
- `src/pages/DesvioDetalhe.tsx` — adicionar botão "Anotar" sobre cada foto já enviada. Ao salvar, faz upload do blob para o mesmo `file_key` no bucket (sobrescreve), depois invalida a query para recarregar.

## Storage

- Mesmo bucket atual de `fotos_evidencia`. Reusa `supabase.storage.from(bucket).upload(file_key, blob, { upsert: true })` para sobrescrever. Sem mudança de schema, sem nova migration.

## Fora de escopo

- Edição posterior de uma anotação individual (mover/redimensionar). Só "desfazer última" e "limpar tudo".
- Camadas / persistir anotações como JSON separado (poderíamos fazer depois se quiser manter a original intacta).
- Anotação em fotos da Verificação/Ocorrência. Foco inicial: fotos do Desvio. Posso estender depois.
