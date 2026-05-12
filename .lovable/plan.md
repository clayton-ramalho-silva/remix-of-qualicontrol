## Objetivo
Tornar os itens em atraso imediatamente identificáveis no relatório, tanto no PDF quanto no preview, sem poluir o documento.

## Definição de "em atraso"
Um desvio está em atraso quando:
- `prazoSugerido` existe e já passou (`< Date.now()`)
- `status !== "fechado"` (itens já encerrados não contam)

Cálculo de dias: `Math.floor((now - prazoSugerido) / 86400000)`

## Mudanças (apenas `src/pages/Relatorio.tsx`)

### 1. Helper compartilhado
Criar `isAtrasado(d)` e `diasAtraso(d)` reutilizados por PDF e preview.

### 2. Badge "EM ATRASO • X dias"
Selo vermelho (`bg:#fef2f2`, `color:#dc2626`, borda `#fecaca`) usado:
- Ao lado do prazo na coluna "Prazo" do índice
- No header do card de detalhamento de cada desvio (quando a seção de detalhamento está ativa)

No preview React: usar `<Badge variant="destructive">` + ícone `AlertTriangle`.

### 3. Linhas vermelhas no índice
Em `buildRow`, quando `isAtrasado(d)`:
- `<tr>` recebe `background:#fef2f2`
- Borda esquerda 3px vermelha (`box-shadow:inset 3px 0 0 #dc2626` na primeira `<td>`)

Mesmo tratamento aplicado ao agrupamento por ambiente.

### 4. KPI "Atrasados" já existe — torná-lo clicável visualmente
O KPI já está no array (linha 172). Apenas reforçar o destaque:
- Borda `#fecaca` quando valor > 0
- Mantém cor vermelha que já tem

### 5. Nova seção "⚠️ Itens em Atraso" (logo após os KPIs)
Bloco dedicado renderizado quando há ≥1 desvio atrasado e a flag `mostrarAtrasados` (default `true`) estiver ativa.

Conteúdo:
- Título com ícone de alerta + contagem total
- Tabela compacta ordenada por **maior atraso primeiro**, com colunas: `#`, Grupo, Descrição (truncada), Responsável/Fornecedor, Prazo, **Dias em atraso** (badge vermelho)
- Link `#desvio-{id}` para o card de detalhamento

Aplicado tanto no PDF (`atrasoHtml` injetado entre KPIs e Resumo por Grupo) quanto no preview React.

### 6. Novo toggle de configuração
Checkbox **"Itens em atraso"** (ícone `AlertTriangle`) na seção "Conteúdo do Relatório", ao lado dos toggles existentes (`mostrarDetalhamento`, `mostrarAprovacoes`, etc.). Default: `true`.

Controla:
- A seção dedicada (item 5)
- O badge "EM ATRASO" no índice e nos cards (itens 2 e 3)

Quando desabilitado, o relatório fica idêntico ao atual.

## Sem mudanças no backend
A edge function `gerar-relatorio` já retorna `prazoSugerido`, `status` e `dataIdentificacao`. Todo o tratamento é puramente front-end/apresentação.

## Arquivo afetado
- `src/pages/Relatorio.tsx`
