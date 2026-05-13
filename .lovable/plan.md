## Problema

A listagem em `/checklists` (Checklist de Vistoria de Entrega) só tem botões de Editar e Imprimir na coluna **Ações**. Não há como excluir um checklist.

## Solução

Adicionar um botão de lixeira na coluna Ações, com confirmação via `AlertDialog`, que apaga o registro de `checklist_entregas`. As tabelas filhas (`checklist_entrega_itens` e `checklist_entrega_fotos`) já têm `ON DELETE CASCADE`, então a exclusão é limpa em uma única chamada.

### Mudanças (apenas em `src/pages/ChecklistList.tsx`)

1. Importar `Trash2` do `lucide-react`, `AlertDialog*` de `@/components/ui/alert-dialog` e `toast` do `sonner`.
2. Adicionar estado `confirmDeleteId: number | null` e `deleting: boolean`.
3. Adicionar botão `<Button variant="ghost" size="sm">` com ícone `Trash2` (cor destructive) ao lado dos botões existentes em cada linha; ao clicar, seta `confirmDeleteId`.
4. Renderizar `<AlertDialog>` ao final do componente:
   - Título: "Excluir checklist?"
   - Descrição avisando que itens e fotos vinculados também serão removidos.
   - Ação confirma → `await supabase.from("checklist_entregas").delete().eq("id", confirmDeleteId)` → toast de sucesso/erro → `load()` para atualizar lista.

Sem mudanças de schema, RLS ou backend — a policy `auth all ent` já permite DELETE para usuários autenticados, e o cascade cuida das tabelas filhas.
