## Agrupar desvios por ambiente no relatório

Adicionar uma nova opção no menu "Conteúdo do Relatório" (em `src/pages/Relatorio.tsx`) que permite agrupar os desvios por ambiente/localização tanto no Índice quanto no Detalhamento.

### UI
- Novo checkbox "Agrupar por ambiente" na seção "Conteúdo do Relatório", com ícone (ex: `MapPin`).
- Estado `agruparPorAmbiente` (default `false`) incluído no payload do relatório.

### Critério de agrupamento
- Usar o campo `localizacao` do desvio como chave do grupo.
- Desvios sem `localizacao` ficam num grupo final chamado "Sem ambiente definido".
- Ordenação dos grupos: alfabética por nome do ambiente; dentro de cada grupo manter a ordenação atual (por data/severidade já aplicada).

### Renderização (PDF + Preview)
Quando `agruparPorAmbiente` estiver ativo:

- **Índice:** em vez de uma única tabela, renderizar uma tabela por ambiente, precedida por um cabeçalho `<h3>` com o nome do ambiente e a contagem (ex: "Sala 201 — 4 desvios"). Colunas existentes permanecem; a coluna "Local" pode ser ocultada (redundante) — manter por padrão para não quebrar layout, mas avaliar.
- **Detalhamento:** os cards dos desvios são agrupados sob um título de seção por ambiente (`<h2>` estilizado), mantendo a numeração global dos desvios.
- Quebras de página: cada novo grupo começa em nova página no PDF (`page-break-before: always`), exceto o primeiro.

Quando desativado: comportamento atual permanece inalterado.

### Arquivos
- `src/pages/Relatorio.tsx` — único arquivo alterado (estado, checkbox, lógica de agrupamento no HTML do PDF e na pré-visualização).
