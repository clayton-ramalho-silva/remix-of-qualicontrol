## Problema

O 3º select da "Localização na Planta" exibe o nome do arquivo da planta (ex: `PHOTO 2026 05 11 09 17 49.jpg`). Quando o nome é longo, ele estoura a largura do trigger e dos itens do dropdown.

## Solução

Manter o nome real (não renomear nem esconder), apenas garantir que o texto seja truncado com `…` dentro dos limites do componente, com tooltip para ver o nome completo no hover.

## Mudanças

**Arquivo:** `src/components/PlantaPinSelector.tsx`

1. No `SelectTrigger` da Planta (linha ~208): adicionar classes para evitar overflow — `min-w-0` no trigger e `truncate` no `SelectValue` (envolto num `<span className="truncate">`).
2. Nos `SelectItem` da lista de plantas (linha ~213-215): envolver `{p.nome}` em `<span className="truncate block max-w-[260px]" title={p.nome}>` para limitar largura visível e mostrar tooltip nativo com nome completo.
3. Mesmo tratamento (defensivo) nos selects de Edifício e Andar caso nomes longos apareçam: adicionar `min-w-0` no trigger e `truncate` no value.

Sem mudanças de backend, schema, ou em outros arquivos.

## Resultado esperado

O dropdown sempre cabe dentro do grid de 3 colunas, mostrando `PHOTO 2026 05 11 09 17 49…` ou similar, e o usuário pode passar o mouse para ver o nome completo.
