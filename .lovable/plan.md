Adicionar hiperlinks do índice de desvios para o card correspondente no PDF gerado por `handlePrint` em `src/pages/Relatorio.tsx`.

### Mudanças

1. **Card de detalhamento** — adicionar atributo `id="desvio-${d.id}"` ao `<div>` raiz de cada desvio no `detailHtml`.
2. **Índice de desvios** — substituir o `#id` simples em cada linha por:
   ```html
   <a href="#desvio-${d.id}" style="color:#0d9488;text-decoration:none;font-weight:600">#${d.id}</a>
   ```
3. **Estilo de impressão** — incluir regra `@media print` para garantir que o link fique legível (cor mantida, sem sublinhado azul do navegador).

### Onde
- `src/pages/Relatorio.tsx`, seções `indexHtml` e `detailHtml` dentro da função `handlePrint`.

### Resultado esperado
- Clicar no número do desvio no índice leva diretamente ao card detalhado, tanto na pré-visualização (tela) quanto no PDF salvo/gerado pelo Chrome/Edge.
- Nenhuma mudança na edge function, no Excel, nem na pré-visualização React on-screen.