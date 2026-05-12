## Opção de limpar fornecedor no desvio

### Contexto
Atualmente os selects de fornecedor em criação e edição de desvio usam o componente Radix `Select` do shadcn/ui. Esse componente não permite "desselecionar" um valor depois de escolhido — não há forma nativa de voltar a deixar o campo em branco.

### O que será feito
Em ambos os formulários de desvio, adicionar um item **"Nenhum"** no topo da lista de fornecedores:

1. **DesvioNovo.tsx** (criação de desvio)
   - No `<Select>` de fornecedor (linha 449), trocar `value` e `onValueChange` para mapear `"__none__"` → `""`.
   - Inserir `<SelectItem value="__none__">Nenhum</SelectItem>` como primeiro item do `SelectContent`.

2. **DesvioDetalhe.tsx** (edição de desvio)
   - No `<Select>` de fornecedor em modo de edição (linha 507), mesma alteração: mapear `"__none__"` → `""`.
   - Inserir `<SelectItem value="__none__">Nenhum</SelectItem>` como primeiro item do `SelectContent`.

### Resultado esperado
O usuário poderá:
- Criar um desvio sem preencher fornecedor (placeholder "Selecione..." ou "Nenhum").
- Escolher um fornecedor e, se quiser, voltar a selecionar **Nenhum**, limpando o campo antes de salvar.
