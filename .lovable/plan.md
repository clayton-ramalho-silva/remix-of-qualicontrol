
# Hierarquia Obra → Edifício → Andar → Planta

## Conceito

Hoje temos duas telas separadas (Obras e Plantas) com hierarquia plana: **Obra → Planta**. Vamos evoluir para uma estrutura completa **Obra → Edifício → Andar → Planta**, consolidando tudo dentro do menu **Obras** sem perder nenhuma funcionalidade atual de Plantas (upload, ambientes IA, PINs de desvios, visualização).

A página standalone `/plantas` continua funcionando (compatibilidade), mas o fluxo principal passa a ser navegar dentro da obra.

---

## 1. Modelo de dados (migration)

### Novas tabelas

**`edificios`**
- `id`, `obra_id` (FK obras), `nome` (ex: "Torre A", "Bloco Norte"), `codigo` (opcional), `ordem`, `ativo`, timestamps.

**`andares`**
- `id`, `edificio_id` (FK edificios), `nome` (ex: "Térreo", "1º Andar", "Cobertura"), `numero` (int, para ordenação: -1 subsolo, 0 térreo, 1, 2…), `ordem`, `ativo`, timestamps.

### Alteração em `plantas`
- Adicionar `andar_id` (bigint, **nullable**) — FK para `andares`.
- Manter `obra_id` (continua obrigatório, garante compatibilidade e queries diretas).
- Plantas existentes ficam com `andar_id = null` (legado “sem hierarquia”), continuam visíveis e funcionais. Usuário pode reorganizá-las depois movendo-as para um andar.

### Migração suave (sem perder dados)
- Para cada obra existente, **não criar** edifício/andar automaticamente — deixamos o usuário organizar conforme a realidade.
- Mostrar um banner “Plantas sem hierarquia (N)” na página da obra, com botão “Mover para um andar”.

### RLS
- `edificios` e `andares`: `auth all` (mesmo padrão das demais tabelas operacionais).

---

## 2. Navegação e UI

### Menu lateral
- **Mantém** “Obras” no menu.
- **Remove** “Plantas” do menu lateral (vira sub-rota acessada de dentro da obra). Rota `/plantas` continua respondendo para links antigos.

### Nova estrutura de rotas

```
/obras                                  → lista de obras (atual)
/obras/:obraId                          → NOVO: detalhe da obra com abas
/obras/:obraId/edificios/:edId          → NOVO: detalhe do edifício (lista andares)
/obras/:obraId/edificios/:edId/andares/:anId → NOVO: detalhe do andar (lista plantas)
/plantas/:id                            → mantém: visualização de planta com PINs (atual PlantaView)
```

### Tela: `/obras/:obraId` (nova)

Header: nome/código da obra, status, breadcrumb.

Abas:
1. **Visão geral** — cobertura por vertical, último desvio, score (resumo já existente em Obras).
2. **Estrutura** (nova, principal): árvore navegável

```
┌─ Edifícios ────────────────────────────┐
│  ▸ Torre A                     [+ Andar]│
│     ├─ Cobertura  · 2 plantas           │
│     ├─ 5º Andar   · 4 plantas           │
│     └─ Térreo     · 1 planta            │
│  ▸ Bloco Norte                          │
│  + Novo Edifício                        │
├─ Plantas sem hierarquia (3) ────────────┤
│  Térreo Geral · Cobertura Antiga …      │
│  [Mover p/ andar]                       │
└─────────────────────────────────────────┘
```

3. **Desvios** (atalho para `/desvios?obraId=...`).
4. **Verificações** (atalho).

### Tela: `/obras/:obraId/edificios/:edId/andares/:anId`

- Reaproveita 100% o componente atual de **grid de plantas** (`Plantas.tsx`), mas filtrado por `andar_id`.
- Botão "Nova Planta" agora cria já vinculada ao andar atual.
- Mantém: upload, edição, delete, ambientes IA (Sparkles), abrir visualização com PINs.

### Tela: `/plantas/:id` (PlantaView atual)
- Sem mudança funcional. Apenas o breadcrumb passa a mostrar **Obra › Edifício › Andar › Planta** quando houver hierarquia.

### Tela `/plantas` (lista standalone existente)
- Mantida para compatibilidade, com aviso no topo: "A gestão de plantas agora vive dentro de cada Obra. [Ir para Obras]".

---

## 3. Componentes a criar / editar

**Novos:**
- `src/pages/ObraDetalhe.tsx` — abas Visão geral / Estrutura / Desvios / Verificações.
- `src/pages/AndarDetalhe.tsx` — grid de plantas do andar (reusa lógica de `Plantas.tsx`).
- `src/components/EdificioCard.tsx` — card colapsável com lista de andares.
- `src/components/EdificioFormDialog.tsx` — criar/editar edifício.
- `src/components/AndarFormDialog.tsx` — criar/editar andar (com campo `numero` para ordenação).
- `src/components/PlantaMoverDialog.tsx` — mover planta avulsa para um andar.
- `src/components/HierarquiaBreadcrumb.tsx` — breadcrumb Obra › Edifício › Andar › Planta.

**Editados:**
- `src/pages/Obras.tsx` — cards das obras viram clicáveis (linkam para `/obras/:id`).
- `src/pages/Plantas.tsx` — adiciona banner "movemos para Obras" + suporte a filtro por `andarId` via querystring (para reuso interno).
- `src/pages/PlantaView.tsx` — breadcrumb hierárquico.
- `src/pages/DesvioNovo.tsx` / `PlantaPinSelector.tsx` — quando obra tem hierarquia, oferecer seleção em cascata Edifício → Andar → Planta (mantém também busca direta por planta).
- `src/components/DashboardLayout.tsx` — remover item "Plantas" do menu.
- `src/App.tsx` — registrar novas rotas.

**Backend (`src/lib/trpc.ts`):**
- Novo router `edificios`: `listByObra`, `create`, `update`, `delete`.
- Novo router `andares`: `listByEdificio`, `create`, `update`, `delete`.
- `plantas.listByObra`: passa a aceitar opcionalmente `andarId` ou `edificioId`.
- `plantas.upload` / `plantas.update`: aceita `andarId`.
- Novo endpoint `plantas.mover({ id, andarId })`.

---

## 4. Detalhes técnicos

- **Compatibilidade**: `andar_id` nullable garante que nada quebra. Plantas legadas aparecem em "Plantas sem hierarquia" até serem movidas.
- **Ordenação**: `andares.numero` permite ordenar Subsolo → Térreo → Cobertura corretamente. `ordem` em `edificios` permite drag manual futuro.
- **Delete**: Edifício com andares pede confirmação dupla; Andar com plantas pede confirmação e oferece mover plantas para outro andar antes.
- **Cobertura por vertical**: continua a nível de **Obra** (não muda). Edifício/Andar são puramente organizacionais.
- **Desvio + PIN**: PIN continua referenciando `planta_id` diretamente (sem mudança), só o seletor melhora a UX em obras grandes.

---

## 5. O que NÃO muda

- Lógica de PINs, severidade, vinculação de desvios a plantas.
- Extração de ambientes por IA (continua por planta).
- Uploads, storage bucket `plantas`, formatos aceitos.
- Cobertura por vertical (Vistoria/Qualidade/QSMS/Checklist) na obra.
- Planos de ação, verificações, dashboards.

---

## Pergunta antes de implementar

**Edifício é sempre obrigatório?** Em obras pequenas (ex: uma loja, um apartamento único) talvez fizesse sentido ter só Andares direto na Obra, sem Edifício no meio. Duas opções:

**A)** Edifício sempre obrigatório — estrutura uniforme, mais simples de programar.
**B)** Edifício opcional — quando obra tem 1 edifício só, criamos automaticamente um “Principal” oculto, ou permitimos andares direto na obra.

Recomendo **(A)** com criação rápida ("Novo Edifício" pré-preenchido como "Principal" em 1 clique). Mantém modelo limpo e prevê crescimento.

Confirma seguir com (A)?
