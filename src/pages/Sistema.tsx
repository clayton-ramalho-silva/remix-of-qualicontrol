import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/contexts/ThemeContext";

const DIAGRAM = `erDiagram
  obras ||--o{ edificios : possui
  edificios ||--o{ andares : possui
  obras ||--o{ plantas : possui
  andares ||--o{ plantas : "planta do andar"
  plantas ||--o{ planta_ambientes : contem
  obras ||--o{ desvios : registra
  plantas ||--o{ desvios : "localizado em"
  grupos ||--o{ desvios : agrupa
  fornecedores ||--o{ desvios : responsavel
  desvios ||--o{ fotos_evidencia : possui
  desvios ||--o{ historico : possui
  desvios ||--o{ desvio_aprovacoes : possui
  desvios ||--o{ plano_desvios : ref
  planos_acao ||--o{ plano_desvios : ref
  plano_categorias ||--o{ planos_acao : classifica
  obras ||--o{ planos_acao : "no escopo"
  ocorrencias ||--o{ planos_acao : "gera plano"
  obras ||--o{ ocorrencias : ocorre
  ocorrencias ||--o{ ocorrencia_causas : possui
  ocorrencias ||--o{ ocorrencia_comissao : possui
  ocorrencias ||--o{ ocorrencia_cronologia : possui
  ocorrencias ||--o{ ocorrencia_documentos : possui
  ocorrencias ||--o{ ocorrencia_fotos : possui
  ocorrencias ||--o{ ocorrencia_porques : possui
  ocorrencias ||--o{ ocorrencia_testemunhas : possui
  obras ||--o{ verificacoes : recebe
  verificacoes ||--o{ verificacao_respostas : possui
  verificacao_respostas ||--o{ verificacao_resposta_fotos : possui
  checklist_secoes ||--o{ checklist_itens : possui
  checklist_itens ||--o{ verificacao_respostas : avalia
  checklist_disciplinas ||--o{ checklist_entrega_itens : usa
  obras ||--o{ checklist_entregas : possui
  checklist_entregas ||--o{ checklist_entrega_itens : contem
  checklist_entrega_itens ||--o{ checklist_entrega_fotos : possui
  fornecedores ||--o{ checklist_fornecedor_equipe : possui
  fornecedores ||--o{ checklist_entrega_itens : executa
  obras ||--o{ alocacoes : possui
  membros_equipe ||--o{ alocacoes : alocado
  profiles ||--o{ user_roles : possui
  profiles ||--o{ notificacoes : recebe
  desvios ||--o{ notificacoes : gera
  planos_acao ||--o{ notificacoes : gera
`;

export default function Sistema() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      er: { useMaxWidth: true },
    });
    const id = `er-${Date.now()}`;
    mermaid.render(id, DIAGRAM).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    }).catch((e) => {
      if (ref.current) ref.current.innerHTML = `<pre class="text-destructive text-xs">${String(e)}</pre>`;
    });
  }, [theme]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sistema</h1>
        <p className="text-sm text-muted-foreground">
          Diagrama de relacionamento entre as entidades do banco de dados.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4 overflow-auto">
        <div ref={ref} className="mermaid-container min-w-[800px]" />
      </div>
    </div>
  );
}
