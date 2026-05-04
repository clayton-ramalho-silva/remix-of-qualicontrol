# Planos de Ação: Corretivo vs Preventivo + Categorias gerenciáveis

Vamos permitir criar planos sem desvio vinculado (preventivos/avulsos), com Vertical e Obra obrigatórias, e uma Categoria escolhida de uma lista que o admin pode editar/expandir.

## 1. Banco de dados (migração)

**Tabela `planos_acao`** — tornar flexível:
- `desvio_id` → permitir `NULL` (legado continua válido).
- Novas colunas:
  - `tipo` enum (`corretivo` | `preventivo`), default `corretivo`.
  - `vertical` (enum `origem_desvio`, nullable) — usada quando preventivo (ou para destaque quando corretivo).
  - `obra_id` (bigint, nullable) — obrigatória para preventivos.
  - `categoria_id` (bigint, nullable) — referência à nova tabela.

**Nova tabela `plano_categorias`** (para "incluir mais tipos / editar"):
- `id`, `nome` (text), `ativo` (int default 1), `ordem` (int), `created_at`, `updated_at`.
- Seed inicial: Treinamento, Auditoria, Melhoria de processo, Compra/EPI, Manutenção preventiva, Outro.
- RLS: leitura para autenticados; insert/update/delete para `admin`.

**Validação** (trigger ou no tRPC):
- Se `tipo='preventivo'`: exigir `vertical`, `obra_id`, `categoria_id`; `desvio_id` deve ser NULL e sem registros em `plano_desvios`.
- Se `tipo='corretivo'`: exigir ao menos 1 registro em `plano_desvios`.

## 2. Frontend

**`src/pages/PlanoAcaoNovo.tsx`**
- Toggle no topo: **Corretivo** (padrão) | **Preventivo / Avulso**.
- Modo Corretivo: layout atual + correção do filtro de vertical do dialog (adicionar **Vistoria**, ordem **Vistoria | Qualidade | QSMS | Checklist**).
- Modo Preventivo: esconde "Desvios Vinculados"; mostra:
  - Select **Obra** (obrigatório)
  - Select **Vertical** (obrigatório, ordem padrão)
  - Select **Categoria** (lista de `plano_categorias` ativas, com link "Gerenciar categorias" visível para admins)

**`src/pages/PlanosAcao.tsx`**
- Card mostra badge "Preventivo" (azul, ícone escudo) quando aplicável.
- Filtro de vertical considera `plano.vertical` OU `desvios[].origem`.
- Novo filtro opcional **Tipo** (Todos | Corretivo | Preventivo).

**`src/pages/PlanoAcaoDetalhe.tsx`**
- Mostrar Tipo, Vertical, Obra e Categoria quando preventivo.

**`src/pages/Administracao.tsx`** — nova seção "Categorias de Plano de Ação"
- CRUD simples (lista, criar, renomear, ativar/desativar, reordenar). Apenas admin.

## 3. Backend (tRPC `planos`)

- `create`: aceitar `tipo`, `vertical`, `obraId`, `categoriaId`; `desvioIds` opcional. Validar conforme tipo.
- `list`: incluir `tipo`, `vertical`, `obra`, `categoria` no payload.
- Novo router `planoCategorias`: `list`, `create`, `update`, `toggleAtivo`, `reorder` (admin-only nas mutações).

## 4. Detalhes técnicos

- Ordem padrão de verticais em todos os selects: **Vistoria | Qualidade | QSMS | Checklist**.
- Categorias são apenas para planos preventivos (corretivos herdam contexto dos desvios).
- Migração não quebra dados existentes: planos atuais ficam como `tipo='corretivo'` e mantêm `desvio_id`.

## 5. O que NÃO faremos agora

- Não vincular categoria a planos corretivos (pode ser evolução futura).
- Não criar workflow de aprovação de planos preventivos.
