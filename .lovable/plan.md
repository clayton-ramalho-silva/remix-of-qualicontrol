
# Novo módulo: Checklist de Entrega de Obra

Criar um novo menu **Checklist** para gerar o "Relatório de Vistoria de Entrega de Obra" (modelo enviado em PDF), reaproveitando obras, fornecedores, equipe alocada e fotos de desvios já existentes.

---

## 1. Menu e navegação

- Adicionar item **"Checklist"** na sidebar (`src/components/DashboardLayout.tsx`), entre "Desvios" e "Planos de Ação", com ícone `ClipboardList`/`ListChecks`.
- Novas rotas em `src/App.tsx`:
  - `/checklists` — lista de checklists criados
  - `/checklists/novo` — criar novo
  - `/checklists/:id` — editar/visualizar
- Na página **Relatório** (`/relatorio`), adicionar uma nova **aba "Vistoria de Entrega"** ao lado da existente, para gerar o PDF deste módulo.

---

## 2. Estrutura do Checklist (baseado no modelo)

### 2.1 Cabeçalho (página 1 do PDF)
- Obra (apenas obras que já tenham desvios cadastrados)
- Data da Vistoria
- Metragem (m²)
- GC (Gerente de Contrato) — texto livre com sugestão dos membros da equipe
- GO (Gerente de Obra) — idem
- Condição da Obra: **RUIM | REGULAR | ÓTIMA** (botões coloridos)
- Total de Itens (calculado: soma de itens das disciplinas + desvios vinculados)

### 2.2 Resumo (grid de disciplinas)
Tabela editável com linhas:
- **Disciplina** (select de catálogo dedicado a este formulário)
- **Fornecedor** (autocomplete a partir de `fornecedores`)
- **Equipe Alocada** (autocomplete; ao escolher fornecedor, sugere equipes já vinculadas a ele)
- **Avaliação** — 3 ícones equivalentes aos do PDF:
  - ✅ OK (verde)
  - ⚠️ Atenção (amarelo)
  - ❌ Crítico (vermelho)
- **Comentários** (texto livre)
- Botão "+ Adicionar disciplina"

### 2.3 Páginas de detalhe por disciplina (páginas 3+ do PDF)
Para cada linha da tabela, abrir bloco expandível:
- Título: `DISCIPLINA / FORNECEDOR — RESPONSÁVEL`
- Galeria de fotos: usuário **escolhe entre fotos de desvios já existentes** da mesma obra (filtro por disciplina/fornecedor sugerido).
- Para cada foto selecionada: legenda pré-preenchida com a descrição do desvio (editável).
- Permite reordenar e remover fotos.

---

## 3. Persistência (banco)

Migrações novas (sem alterar tabelas existentes):

- **`checklist_disciplinas`** — catálogo das disciplinas válidas para este formulário (Pedra, Forro Modular, Dados/voz, Vidro, Limpeza fina, Elétrica, Sdai, Hidráulica/SPK, Drywall, Civil, Pintura, Rodapé, Vinílico/Carpete/Piso elevado, Marcenaria, Carpete, Serralheria, Divisória Industrial, Luminária, Ar Condicionado). Campos: `nome`, `ordem`, `ativo`. Seed com a lista do modelo.

- **`checklist_fornecedor_equipe`** — relação Fornecedor ↔ Equipe alocada (nomes), para sugerir equipes ao escolher fornecedor. Campos: `fornecedor_id`, `nome_equipe`, `disciplina` (opcional). Alimentado automaticamente conforme o usuário preenche.

- **`checklist_entregas`** — cabeçalho do checklist. Campos: `obra_id`, `data_vistoria`, `metragem_m2`, `gc`, `go`, `condicao` (`ruim|regular|otima`), `total_itens`, `created_by_id`, `created_by_name`.

- **`checklist_entrega_itens`** — uma linha do grid. Campos: `entrega_id`, `disciplina_id`, `fornecedor_id`, `fornecedor_nome`, `equipe_nome`, `avaliacao` (`ok|atencao|critico`), `comentarios`, `ordem`.

- **`checklist_entrega_fotos`** — fotos escolhidas para cada item. Campos: `item_id`, `foto_evidencia_id` (referência a `fotos_evidencia` por id), `legenda`, `ordem`.

RLS: padrão `auth all` (consistente com tabelas existentes do projeto).

---

## 4. Geração do Relatório (PDF)

Reutilizar o pipeline atual de `src/pages/Relatorio.tsx` (window.print + HTML estilizado):
- **Página 1**: cabeçalho + tabela RESUMO (disciplina, fornecedor, equipe, ícone de avaliação, comentário).
- **Páginas seguintes**: uma seção por item, com título `DISCIPLINA` + `FORNECEDOR — RESPONSÁVEL`, grade de fotos (2x2) com legenda abaixo, conforme modelo.
- Cabeçalho fixo no topo de cada página (Obra, Condição, Data, Metragem, GC, GO, Total Itens), igual ao modelo.
- Numeração de página `n/total`.

---

## 5. UX / Detalhes técnicos

- Página `Novo Checklist`: usar `Tabs` (Cabeçalho → Resumo → Detalhes por disciplina → Pré-visualização).
- Filtro de obras: `obras` que tenham pelo menos 1 desvio.
- Picker de fotos: dialog com grid de `fotos_evidencia` filtradas pela `obra_id`, agrupadas por desvio, com checkbox múltiplo. Ao confirmar, copia descrição do desvio como legenda inicial.
- Sugestão de equipe: ao mudar `fornecedor_id`, buscar `checklist_fornecedor_equipe` e oferecer chips clicáveis.
- Salvar como rascunho a cada alteração (debounced) ou botão "Salvar".

---

## Arquivos a criar/editar

**Novos:**
- `src/pages/ChecklistList.tsx`
- `src/pages/ChecklistEditor.tsx`
- `src/components/checklist/ResumoGrid.tsx`
- `src/components/checklist/DisciplinaDetalhe.tsx`
- `src/components/checklist/FotosDesvioPicker.tsx`
- `src/components/checklist/AvaliacaoIcon.tsx`
- Migração SQL com as 5 tabelas + seed de disciplinas

**Editar:**
- `src/App.tsx` — registrar rotas
- `src/components/DashboardLayout.tsx` — item de menu
- `src/pages/Relatorio.tsx` — nova aba "Vistoria de Entrega" com geração do PDF deste modelo
