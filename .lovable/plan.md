## Objetivo

Permitir que o usuário escolha, no card **Conteúdo do Relatório** (`/relatorio`), quais blocos analíticos serão impressos no PDF/preview:

1. **Indicadores** (KPIs)
2. **Resumo por Grupo** (tabela por disciplina)
3. **Performance de Fornecedores**
4. **Índice de Desvios**

Hoje:
- *Indicadores* e *Índice de Desvios* sempre são renderizados (não há controle).
- *Resumo por Grupo* já existe como "Tabela de grupos" (`mostrarTabelaGrupos`) — apenas renomear o rótulo para "Resumo por Grupo" para alinhar com o nome usado no PDF.
- *Performance de Fornecedores* hoje está acoplada ao toggle "Mostra fornecedores" (`mostrarFornecedores`), que também controla a coluna fornecedor na tabela. Vamos desacoplar criando um toggle próprio.

## Mudanças (somente `src/pages/Relatorio.tsx`)

### Novos estados

```ts
const [mostrarIndicadores, setMostrarIndicadores] = useState(true);
const [mostrarPerformanceFornecedores, setMostrarPerformanceFornecedores] = useState(true);
const [mostrarIndiceDesvios, setMostrarIndiceDesvios] = useState(true);
```

(Reaproveita `mostrarTabelaGrupos` para "Resumo por Grupo".)

### Config enviada ao gerador

Adicionar ao objeto `cfg` enviado ao backend/PDF builder:

```ts
mostrarIndicadores,
mostrarPerformanceFornecedores,
mostrarIndiceDesvios,
```

### Geração do HTML do PDF (linhas ~210-275 e ~423-428)

- KPIs (linha 423): envolver em `${cfg.mostrarIndicadores ? ... : ""}`.
- Performance (linha 225): trocar `if (cfg.mostrarFornecedores && ...)` por `if (cfg.mostrarPerformanceFornecedores && ...)`.
- Índice (linha 234): envolver em `if (cfg.mostrarIndiceDesvios !== false && desvios.length > 0)`.
- Resumo por Grupo já controlado por `cfg.mostrarTabelaDisciplinas` (= `mostrarTabelaGrupos`) — sem mudança.

### Preview HTML (seção que renderiza no app, ~903)

Aplicar os mesmos guards condicionais nos blocos correspondentes do preview para refletir as escolhas.

### UI — Conteúdo do Relatório (linhas ~662-747)

Adicionar 3 novos checkboxes (e renomear o label de "Tabela de grupos" para "Resumo por Grupo"):

- ☐ Indicadores (ícone `BarChart3`)
- ☐ Resumo por Grupo (já existe, renomear label)
- ☐ Performance de Fornecedores (ícone `TrendingUp`)
- ☐ Índice de Desvios (ícone `FileText`)

Todos default `true` para manter o comportamento atual.

## Arquivo editado

`src/pages/Relatorio.tsx`
