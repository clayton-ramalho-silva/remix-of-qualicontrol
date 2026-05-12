# Incluir opção "Mostrar Severidade" no Conteúdo do Relatório

Adicionar um checkbox na seção "Conteúdo do Relatório" para que o usuário possa escolher se a **Severidade** aparece ou não no relatório gerado (tanto PDF quanto pré-visualização).

## Onde afeta

A severidade aparece em 4 lugares:

1. **Índice de Desvios (PDF)** — coluna "Severidade" no cabeçalho e em cada linha.
2. **Detalhamento dos Desvios (PDF)** — badge de severidade no topo do card de cada desvio.
3. **Índice de Desvios (preview HTML)** — coluna "Severidade" no cabeçalho e em cada linha.
4. **Detalhamento dos Desvios (preview HTML)** — badge de severidade no topo do card de cada desvio.

## Mudanças técnicas

- **Novo estado** `mostrarSeveridade` (default `true`) em `src/pages/Relatorio.tsx`.
- **Payload** do relatório inclui `mostrarSeveridade`.
- **PDF (print HTML)**:
  - Índice: condicionar `<th>Severidade</th>` e célula `sevBadge(d.severidade)` com `cfg.mostrarSeveridade !== false`.
  - Detalhamento: condicionar `sevBadge(d.severidade)` no header do card.
- **Preview HTML**:
  - Índice: condicionar `<th className="...">Severidade</th>` e célula do badge.
  - Detalhamento: condicionar badge de severidade no header do card.
- **Checkbox** na seção "Conteúdo do Relatório" (ao lado dos demais, usando ícone `Gauge` ou `AlertTriangle`).
