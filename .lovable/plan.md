## Menu "Aprovações" + perfis de aprovador + registro no relatório

Criar fluxo completo de aprovação para desvios em **Aguardando Aceite** que tenham as tags **Solicitar Aprovação Gerenciadora** ou **Solicitar Aprovação Arquitetura Externa**, com dois novos itens de menu, dois novos perfis de usuário e exibição das aprovações no relatório.

---

### 1. Banco de dados (migration)

**Novos roles** — adicionar ao enum `app_role`:
- `aprovador_gerenciadora`
- `aprovador_arquitetura`

**Nova tabela `desvio_aprovacoes`** para registrar cada decisão (permite histórico e múltiplas aprovações por desvio):
- `desvio_id` (bigint)
- `tipo` enum novo `tipo_aprovacao`: `gerenciadora` | `arquitetura`
- `decisao` enum novo `decisao_aprovacao`: `aprovado` | `reprovado`
- `aprovador_id` (uuid), `aprovador_nome` (text)
- `comentario` (text, obrigatório quando reprovado — validado no client)
- `created_at`

**RLS:**
- `SELECT`: qualquer authenticated (read-only para todos no menu).
- `INSERT`: apenas usuários com role correspondente (`has_role(auth.uid(),'aprovador_gerenciadora')` para `tipo='gerenciadora'`, idem arquitetura) **ou** `admin`. Validação via trigger `BEFORE INSERT` que confere role vs tipo.

**Atualização do enum existente** não é necessária — usaremos a tabela `desvio_aprovacoes` + a coluna `status` atual de `desvios` para refletir o resultado.

---

### 2. Regras de negócio (no client / hook compartilhado)

Um desvio é "**pendente de aprovação**" quando:
- `status = 'aguardando_aceite'`, **e**
- `tag_solicitado_gerenciadora = 1` ou `tag_solicitado_arquitetura = 1`, **e**
- ainda não há registro em `desvio_aprovacoes` para a(s) tag(s) ativa(s).

**Ao aprovar** (ação de um aprovador na sua fila):
1. Inserir linha em `desvio_aprovacoes` (`decisao='aprovado'`).
2. Se ainda houver outra tag de aprovação pendente → manter `aguardando_aceite`.
3. Se for a última pendência → atualizar `desvios.status = 'fechado'` + `data_fechamento = now`.
4. Inserir linha em `historico` ("Aprovado por X — Gerenciadora/Arquitetura").

**Ao reprovar** (comentário obrigatório):
1. Inserir linha em `desvio_aprovacoes` (`decisao='reprovado'`, `comentario`).
2. `desvios.status = 'em_andamento'`.
3. Histórico + (futuro) notificação ao responsável.

---

### 3. Navegação (`src/components/DashboardLayout.tsx`)

Dois novos itens, agrupados sob ícone `ShieldCheck`, posicionados **logo após "Planos de Ação"**:

```
Aprovações Gerenciadora     /aprovacoes/gerenciadora
Aprovações Arquitetura      /aprovacoes/arquitetura
```

- **Visibilidade:** todos os usuários autenticados veem.
- **Badge de contagem:** só aparece quando o usuário tem o role correspondente (ou é admin). Reusa o padrão do `badgeKey` existente (`planosPendentes`) — adicionar `aprovacoesGerenciadoraPendentes` e `aprovacoesArquiteturaPendentes` no `trpc.notificacoes.contagens` (ou query equivalente).

---

### 4. Páginas novas

**`src/pages/AprovacoesGerenciadora.tsx`** e **`src/pages/AprovacoesArquitetura.tsx`** (componente compartilhado `AprovacoesList` com prop `tipo`):

Layout:
- Header com contador ("3 desvios aguardando sua aprovação").
- Filtros: obra, fornecedor, severidade, busca.
- Lista em cards (mobile-friendly): foto miniatura, descrição, obra/local, severidade, data, badges de tags.
- Click no card → drawer/dialog com detalhe completo (fotos, planos de ação, histórico) + dois botões grandes: **Aprovar** (verde) e **Reprovar** (vermelho, abre textarea obrigatória).
- Para usuários **sem o role**: mesma tela, mas botões desabilitados com tooltip "Você não tem permissão de Aprovador de [tipo]" (read-only confirmado).
- Estado vazio amigável ("Nenhuma aprovação pendente 🎉").

---

### 5. Relatório (`src/pages/Relatorio.tsx` + `supabase/functions/gerar-relatorio/index.ts`)

**Novo checkbox** em "Conteúdo do Relatório":
- "Mostrar aprovações" (ícone `ShieldCheck`), default `true`, estado `mostrarAprovacoes`.

**Edge function:** carregar `desvio_aprovacoes` para os `ids` retornados (uma query) e anexar `aprovacoes: [{tipo, decisao, aprovador_nome, comentario, data}]` em cada desvio.

**Renderização (PDF + Preview), quando `mostrarAprovacoes` ativo:**
- **Índice:** nova coluna compacta "Aprov." com badges: `G✓` / `G✗` / `A✓` / `A✗` (verde/vermelho), só mostra as tags relevantes do desvio.
- **Detalhamento (card do desvio):** bloco "Aprovações" abaixo de Tags, listando "[Tipo] — [Decisão] por [Nome] em [data]" + comentário se houver.

Quando desativado: comportamento atual.

---

### 6. Administração — atribuição de roles

Em `src/pages/Usuarios.tsx` (ou `Administracao.tsx`, conforme onde hoje se gerencia roles): adicionar checkboxes para os dois novos roles ao lado de "Admin". Uso do mesmo fluxo já existente de `user_roles`.

---

### Detalhes técnicos

- **Arquivos novos:** `src/pages/AprovacoesGerenciadora.tsx`, `src/pages/AprovacoesArquitetura.tsx`, `src/components/AprovacoesList.tsx` (compartilhado), `src/components/AprovacaoActions.tsx` (botões + dialog reprovar).
- **Arquivos editados:** `App.tsx` (rotas), `DashboardLayout.tsx` (menu + badges), `Relatorio.tsx` (checkbox + render), `gerar-relatorio/index.ts` (query + payload), `Usuarios.tsx` (atribuir roles), `useAuth.ts` (expor lista de roles, não só `isAdmin`).
- **Hook utilitário:** `useAprovacoes(tipo)` encapsula query + mutações.
- **Sem mudança em** `desvios.status` enum — fluxo final continua usando `aguardando_aceite` → `fechado`/`em_andamento`.
- **Migration única** cria enum extensions + tabela + RLS + trigger.

### Fora deste escopo (sugestões para depois)
- E-mail/notificação push ao aprovador quando um desvio entra na fila.
- Reabrir aprovação após nova evidência adicionada (fluxo de re-submissão).
