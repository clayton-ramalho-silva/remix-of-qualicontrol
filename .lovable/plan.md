## Reorganizar Grid de Edição do Desvio

### Problema
Em `DesvioDetalhe.tsx` (modo edição), os campos **Origem**, **Descrição** e **Prazo Sugerido** ocupam linhas inteiras sozinhos, quebrando o ritmo visual do grid de 2 colunas usado pelos demais campos.

### Solução
Reorganizar o `CardContent` de edição (linhas ~321-465) para um único grid `md:grid-cols-2` consistente:

```
┌─────────────────┬─────────────────┐
│ Grupo *         │ Fornecedor      │
├─────────────────┼─────────────────┤
│ Origem *        │ Severidade *    │
├─────────────────┼─────────────────┤
│ Localização     │ Prazo Sugerido  │
├─────────────────┴─────────────────┤
│ Descrição *  (col-span-2)         │
├───────────────────────────────────┤
│ Classificações  (col-span-2)      │
├───────────────────────────────────┤
│ Localização na Planta (col-span-2)│
└───────────────────────────────────┘
```

### Detalhes técnicos
- Substituir os três blocos `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` independentes + campos soltos por **um único grid** envolvendo todos os campos curtos.
- Aplicar `md:col-span-2` em **Descrição**, **Classificações**, **PlantaPinSelector** e na barra de botões (Cancelar/Salvar) para que ocupem a linha inteira.
- Manter espaçamento `gap-4` e a estrutura interna de cada campo (Label + Select/Input/Textarea) intacta — sem mudanças no estado, validação ou backend.
- O `VoiceRecorderButton` continua ancorado dentro do Textarea de Descrição.

### O que NÃO muda
- Modo leitura (`!isEditing`) permanece como está.
- Nenhuma mudança em `OcorrenciaEditar`, `EditarVerificacao`, rotas ou backend.