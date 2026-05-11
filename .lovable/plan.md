## Objetivo
Permitir que um administrador defina ou redefina a palavra-passe de um membro da equipe diretamente na página **Equipe**, sem que o utilizador precise passar pelo fluxo de "Criar conta" em `/auth`.

## Como vai funcionar para o utilizador

**Ao criar novo membro** (botão "Novo Membro"):
- Surge um campo opcional **"Palavra-passe inicial"** (mín. 6 caracteres).
- Se o email + senha forem preenchidos:
  - O sistema cria a conta de login automaticamente (email já confirmado, sem precisar de email de confirmação).
  - O membro fica ligado ao utilizador autenticado pelo email.
  - Ao guardar, mostra um aviso: *"Conta criada. Partilhe a senha com o membro — ele deve trocá-la no primeiro login."*
- Se a senha não for preenchida, comporta-se como hoje (só registo de contacto, sem login).

**Em cada linha da lista de membros**:
- Novo botão **"Definir/Redefinir senha"** (ícone de chave) ao lado do botão editar.
- Abre diálogo simples: campo "Nova senha" + "Confirmar".
- Se o email do membro ainda não tem conta → cria nova conta com essa senha.
- Se já tem conta → atualiza a senha.
- Mostra toast: *"Senha definida. Partilhe com o utilizador."*

## Segurança
- Apenas utilizadores com role **admin** veem os botões e podem usar a função.
- A operação é feita por uma **edge function** (`admin-set-password`) que:
  - Valida o JWT do chamador.
  - Confirma via `has_role(uid, 'admin')` no banco antes de qualquer coisa.
  - Usa a service role key (apenas no servidor) para criar/atualizar a senha via API admin.
  - Valida senha mínima de 6 caracteres, email válido.
- Service role key **nunca** sai do servidor.

## Mudanças técnicas

### 1. Banco (migração)
- Adicionar coluna `user_id uuid` em `membros_equipe` (nullable, único quando preenchido).
- Trigger `on_auth_user_login`: quando um utilizador faz login, se existir `membro` com mesmo email e `user_id` nulo, faz o vínculo automaticamente. *(Cobre os casos antigos como o da Maria Claudia.)*
- Atualizar `handle_new_user` para também tentar ligar a um membro existente por email no momento da criação.

### 2. Edge function nova: `admin-set-password`
- Input: `{ email, password, nome?, cargo?, membroId? }`.
- Fluxo:
  1. Autentica chamador, verifica role admin.
  2. Tenta `supabase.auth.admin.getUserByEmail()`.
  3. Se não existir: `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })`.
  4. Se existir: `auth.admin.updateUserById(id, { password })`.
  5. Liga `membros_equipe.user_id` ao uuid retornado, se `membroId` foi passado.
- `verify_jwt = false` (validação manual no código, padrão Lovable).

### 3. Frontend
- `src/pages/Usuarios.tsx`:
  - Adicionar campo `senha` no formulário de criação (só mostrado para admin).
  - Botão "Chave" em cada linha → abre `ResetSenhaDialog`.
  - Em ambos os fluxos, invoca `supabase.functions.invoke('admin-set-password', ...)`.
- Esconder os controlos quando `user.role !== "admin"`.

## Fora do escopo (para depois)
- Convite por email (magic link) com auto-definição de senha.
- Mapeamento automático cargo → role admin/user.
- Forçar troca de senha no primeiro login (Supabase não tem isto nativo; ficaria como flag no `profiles`).

## Resumo da experiência
Admin abre Equipe → cria Maria Claudia com email + senha → entrega a senha → Maria entra direto em `/auth`. Senha esquecida? Admin clica no ícone de chave, define nova e comunica. Sem necessidade de email de confirmação para o utilizador.