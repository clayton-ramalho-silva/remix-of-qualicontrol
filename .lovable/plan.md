## Objetivo
Adicionar uma opção `mostrarDetalhamento` no relatório para que o usuário possa escolher se quer incluir ou não a seção completa de detalhamento dos desvios (cards com descrição, fotos, planos de ação, localização na planta, etc.).

## Problema de UX atual
- O relatório sempre inclui o detalhamento completo após o índice, o que pode gerar documentos muito extensos.
- Usuários que só precisam da visão consolidada (KPIs + índice + resumos) não têm como suprimir os cards de detalhe.

## Mudanças propostas

### 1. Front-end — Configuração do relatório (`src/pages/Relatorio.tsx`)
- **Novo estado:** `mostrarDetalhamento` (padrão: `true`, para manter compatibilidade).
- **Novo checkbox** na seção "Conteúdo do Relatório", ao lado do "Agrupar por ambiente", com ícone `FileText`.
- **Envio para API:** incluir `mostrarDetalhamento` no payload do `handleGenerate`.

### 2. Front-end — PDF (`handlePrint`)
- Envolver o bloco `detailHtml` (linhas ~234-321) com condicional `cfg.mostrarDetalhamento !== false`.
- Quando desabilitado, o PDF omite completamente a seção "Detalhamento dos Desvios" ou "Detalhamento dos Desvios por Ambiente".

### 3. Front-end — Preview UI (React)
- Envolver o bloco "Detalhe de cada desvio" (linhas ~964-1100+) com condicional `data.config?.mostrarDetalhamento !== false`.
- Índice, KPIs, Performance de Fornecedores e Análise IA continuam aparecendo normalmente.

## Nenhuma mudança de backend
- Não é necessário alterar a edge function `gerar-relatorio`, pois ela já devolve todos os dados necessários (`desvios`, `config`). O front-end apenas decide renderizar ou não a seção de detalhamento baseado na flag.

## Arquivos afetados
- `src/pages/Relatorio.tsx` — único arquivo modificado.
