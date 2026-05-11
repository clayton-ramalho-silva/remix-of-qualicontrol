## Habilitar Edição em Todos os Formulários

### Diagnóstico
| Formulário | Edição hoje | Lacuna |
|---|---|---|
| Desvios | Inline em `DesvioDetalhe` (botão Editar) | Bloqueado quando `status=fechado` |
| Verificações (Qualidade/Vistoria/QSMS) | Página `/...editar` (`EditarVerificacao`) | Nenhuma |
| Ocorrências QSMS | Apenas troca de status | **Faltam todos os campos** |

### Mudanças

#### 1. Criar `src/pages/OcorrenciaEditar.tsx` (novo)
- Espelho de `OcorrenciaNova` com os campos pré-preenchidos a partir de `ocorrencias.getById`.
- Campos: classificação, obra, data/hora, local, endereço/cidade/UF, empresa principal + CNPJ, subcontratada + CNPJ, dados do acidentado (nome/função/idade), descrição preliminar, ação imediata, responsável obra/preenchimento, CAT número, dias de atestado, flags CAT emitida e AWFOR-149 anexada, observações.
- Usa `trpc.ocorrencias.update.useMutation()` (já existe no backend) → ao salvar volta para `/qsms/ocorrencias/:id`.
- Inclui validação client-side com `zod` (obrigatórios: obra, data, classificação, descrição preliminar).
- Botão "Cancelar" e "Salvar alterações".

#### 2. `src/pages/OcorrenciaDetalhe.tsx`
- Adicionar botão **Editar** no header (ícone `Pencil`) → navega para `/qsms/ocorrencias/:id/editar`.
- Manter o painel de mudança de status como atalho rápido.

#### 3. `src/App.tsx`
- Registrar rota `/qsms/ocorrencias/:id/editar` → `<OcorrenciaEditar />`.

#### 4. `src/pages/DesvioDetalhe.tsx`
- Permitir abrir a edição inline também quando `status = "fechado"`, mostrando aviso amarelo "Editando desvio fechado". A condição atual `data.status !== "fechado" && !isEditing` passa a `!isEditing`.
- Salvar continua chamando `desvios.update` (já permitido pelo backend).

### O que NÃO muda
- Nenhuma migração de banco — `ocorrencias.update` já está pronto e cobre todos os campos.
- Nenhuma alteração em `verificacoes` ou no fluxo de Planos de Ação.
- Permissões RLS continuam as mesmas (`authenticated all`).