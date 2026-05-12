Ajuste de label no relatório

## Objetivo
Alterar o nome exibido do campo "data de criação" para "Data de Abertura" na seção "Conteúdo do Relatório".

## Alteração
- **Arquivo:** `src/pages/Relatorio.tsx`
- **Linha ~655:** O checkbox atualmente exibe "Mostra data de criação". Alterar label para "Data de Abertura".

Não há impacto em variáveis de estado, backend, ou outras funcionalidades — apenas ajuste de texto exibido na interface.