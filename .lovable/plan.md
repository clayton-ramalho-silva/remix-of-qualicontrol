## Análise

Sim — a estrutura é **praticamente idêntica** ao que já temos para Qualidade e Vistoria de Recebimento. O sistema já foi construído de forma multi-vertical:

- `checklist_secoes` / `checklist_itens` têm o campo `categoria` (atualmente `qualidade` e `vistoria`).
- `verificacoes` tem o campo `categoria`.
- `config_faixas` tem `categoria`.
- A página `Verificacoes.tsx` já aceita props `categoria`, `titulo`, `rotaBase` — basta plugar uma nova rota.
- A Administração já tem um seletor de vertical (Qualidade / Vistoria) — basta adicionar QSMS.
- O enum `origem_desvio` já contempla `qsms` (e `VERTICAL_CONFIG` já define a vertical QSMS em `VerticalContext`).

A planilha SST tem 9 seções (Acompanhamento, Condições de Obra, Documentos Legais, Equipamentos/Ferramentas, Sinalização, Avaliação, Apontamento MT, Situações NAT, Observações) com respostas **AT / NAT / NA / RI** e códigos de infração (I1–I4) com UFIR. Para a primeira versão proponho reutilizar o mesmo modelo de resposta atual (`sim/nao/na`) mapeando AT=sim, NAT=nao, NA=na, e tratar **RI (Reincidência)** e **código de infração (I1–I4 / UFIR)** como extensões futuras se necessário — assim o QSMS entra no ar imediatamente sem mudança de schema.

## Plano

### 1. Menu e navegação
- Em `DashboardLayout.tsx`, adicionar item de menu **"QSMS"** (ícone `ShieldAlert` ou `HardHat`), apontando para `/qsms`.
- Em `App.tsx`, registrar rotas espelhando vistoria:
  - `/qsms` → `<Verificacoes categoria="qsms" titulo="Verificações QSMS" rotaBase="/qsms" />`
  - `/qsms/nova` → `<NovaVerificacao categoria="qsms" titulo="Nova Verificação QSMS" rotaBase="/qsms" />`
  - `/qsms/:id` → `<VerificacaoDetalhe rotaBase="/qsms" titulo="Verificação QSMS" />`
  - `/qsms/:id/editar` → `<EditarVerificacao rotaBase="/qsms" />`

### 2. Administração — vertical QSMS
- Em `Administracao.tsx`, adicionar `{ id: "qsms", label: "QSMS" }` no seletor de vertical (junto com Qualidade e Vistoria).
- Nenhum outro código muda: as Tabs (Pesos, Itens, Faixas) já filtram por `categoria` via tRPC, então criar/editar seções, itens e faixas de QSMS funciona automaticamente.
- Adicionar faixas padrão de QSMS na migração (ex.: ÓTIMA ≥90, REGULAR 70–89, RUIM 50–69, CRÍTICO <50 — mesmas faixas de qualidade, ajustáveis depois).

### 3. Checklist SST pré-carregado
Migração de seed inserindo em `checklist_secoes` (categoria `qsms`) as 9 seções da planilha + itens de cada seção (códigos 1.1, 2.1…2.5, 3.1…3.9, 4.x, 5.x, 6.x). Itens de "Avaliação", "Apontamento MT", "Situações NAT" e "Observações" entram como seções de texto/observação, com peso 0 ou ajustável depois pela Administração.

### 4. Dashboard, Desvios e Planos de Ação
- `VERTICAL_CONFIG.qsms` já existe — nenhum ajuste necessário no `VerticalSwitcher`/filtros.
- Desvios gerados a partir de uma verificação QSMS herdam `origem='qsms'` (enum já existe).
- Planos de Ação e Relatórios já são multi-vertical via `vertical`.

### Detalhes técnicos

- Não há mudança de schema necessária para o MVP — tudo encaixa nas tabelas existentes (`checklist_secoes/itens`, `verificacoes`, `verificacao_respostas`, `verificacao_resposta_fotos`, `config_faixas`).
- Eventual extensão futura (RI/reincidência por resposta, código de infração I1–I4 e UFIR por item): adicionar colunas `infracao_codigo` (text) e `ufir` (numeric) em `checklist_itens`, e `reincidencia` (int) em `verificacao_respostas`. **Fora do escopo deste plano.**
- Reaproveitamos 100% as páginas `Verificacoes`, `NovaVerificacao`, `VerificacaoDetalhe`, `EditarVerificacao` via props.

### Pergunta antes de executar

Você quer que eu já popule o **checklist SST completo** da planilha (todas as 9 seções com seus itens) como seed inicial em QSMS, ou prefere começar com QSMS **vazio** e cadastrar pela tela de Administração?
