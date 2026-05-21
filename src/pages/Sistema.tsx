import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const DIAGRAM = `erDiagram
  obras {
    bigint id PK
    text codigo
    text nome
    text cliente
    text endereco
    status_obra status
    int cobertura
    int cobertura_qualidade
    int cobertura_checklist
    int cobertura_vistoria
    int cobertura_qsms
    text marcacao
    timestamptz created_at
    timestamptz updated_at
  }
  edificios {
    bigint id PK
    bigint obra_id FK
    text nome
    text codigo
    int ordem
    int ativo
  }
  andares {
    bigint id PK
    bigint edificio_id FK
    text nome
    int numero
    int ordem
    int ativo
  }
  plantas {
    bigint id PK
    bigint obra_id FK
    bigint andar_id FK
    text nome
    text url
    text file_key
    int ordem
    text extracao_status
    text extracao_erro
    timestamptz extracao_at
  }
  planta_ambientes {
    bigint id PK
    bigint planta_id FK
    text nome
    text numero
    text pavimento
    numeric pin_x
    numeric pin_y
    text origem
    int revisado
    int ativo
  }
  desvios {
    bigint id PK
    bigint obra_id FK
    bigint planta_id FK
    bigint grupo_id FK
    bigint fornecedor_id FK
    text fornecedor_nome
    text descricao
    text disciplina
    text localizacao
    severidade severidade
    origem_desvio origem
    status_desvio status
    int tag_critico
    int tag_seguranca_trabalho
    int tag_solicitado_cliente
    int tag_solicitado_arquitetura
    int tag_solicitado_gerenciadora
    numeric pin_x
    numeric pin_y
    bigint data_identificacao
    bigint prazo_sugerido
    bigint data_fechamento
    uuid created_by_id
    text created_by_name
    uuid deleted_by_id
    text deleted_by_name
    timestamptz deleted_at
  }
  fotos_evidencia {
    bigint id PK
    bigint desvio_id FK
    tipo_foto tipo
    text descricao
    text url
    text file_key
  }
  historico {
    bigint id PK
    bigint desvio_id FK
    tipo_hist tipo
    text descricao
    text de
    text para
    uuid user_id
    text user_name
  }
  desvio_aprovacoes {
    bigint id PK
    bigint desvio_id FK
    tipo_aprovacao tipo
    decisao_aprovacao decisao
    uuid aprovador_id
    text aprovador_nome
    text comentario
  }
  grupos {
    bigint id PK
    text codigo
    text nome
    int ativo
  }
  fornecedores {
    bigint id PK
    text nome
    text disciplina
    text contato
    text email
    text telefone
  }
  planos_acao {
    bigint id PK
    bigint desvio_id FK
    bigint obra_id FK
    bigint ocorrencia_id FK
    bigint categoria_id FK
    bigint responsavel_id
    text acao
    text responsavel
    text responsavel_email
    responsavel_tipo responsavel_tipo
    tipo_plano tipo
    prioridade_plano prioridade
    status_plano status
    vertical vertical
    bigint prazo
    bigint notificado_em
    int lembrete_enviado
    int alerta_atraso_enviado
    text observacoes
  }
  plano_desvios {
    bigint id PK
    bigint plano_id FK
    bigint desvio_id FK
  }
  plano_categorias {
    bigint id PK
    text nome
    int ordem
    int ativo
  }
  ocorrencias {
    bigint id PK
    bigint obra_id FK
    bigint data_ocorrencia
    bigint data_fechamento
    text hora
    text empresa_principal
    text cnpj_principal
    text empresa_subcontratada
    text cnpj_subcontratada
    text uf
    text cidade
    text endereco
    text local_ocorrencia
    text responsavel_obra
    text responsavel_preenchimento
    text acidentado_nome
    text acidentado_funcao
    int acidentado_idade
    classificacao classificacao
    text descricao_preliminar
    text acao_imediata
    int cat_emitida
    text cat_numero
    int atestado_dias
    int awfor149_anexada
    status_ocorrencia status
    bigint prazo_comissao
    bigint prazo_investigacao
    bigint prazo_plano
    text observacoes
  }
  ocorrencia_causas {
    bigint id PK
    bigint ocorrencia_id FK
    tipo_causa tipo
    categoria_causa categoria
    text descricao
  }
  ocorrencia_comissao {
    bigint id PK
    bigint ocorrencia_id FK
    text nome
    text papel
    text contato
    int is_coordenador
  }
  ocorrencia_cronologia {
    bigint id PK
    bigint ocorrencia_id FK
    text etapa
    text momento
    text descricao
    int ordem
  }
  ocorrencia_documentos {
    bigint id PK
    bigint ocorrencia_id FK
    tipo_doc tipo
    text descricao
    text url
    text file_key
  }
  ocorrencia_fotos {
    bigint id PK
    bigint ocorrencia_id FK
    etapa_foto etapa
    text descricao
    text url
    text file_key
  }
  ocorrencia_porques {
    bigint id PK
    bigint ocorrencia_id FK
    bigint parent_id FK
    int nivel
    text pergunta
    text resposta
    int ordem
  }
  ocorrencia_testemunhas {
    bigint id PK
    bigint ocorrencia_id FK
    text nome
    text identidade
    text contato
    text depoimento
  }
  verificacoes {
    bigint id PK
    bigint obra_id FK
    text categoria
    text avaliador
    bigint data_vistoria
    text diretoria
    text nucleo
    text gc
    text go
    int score_geral
    int score_qualidade
    int score_cronograma
    int score_condicao
    text status_geral
    text status_qualidade
    text status_cronograma
    text status_condicao
    text observacoes
  }
  verificacao_respostas {
    bigint id PK
    bigint verificacao_id FK
    bigint item_id FK
    resposta_verif resposta
    text observacao
  }
  verificacao_resposta_fotos {
    bigint id PK
    bigint verificacao_id FK
    bigint item_id FK
    text url
    text file_key
    text descricao
  }
  checklist_secoes {
    bigint id PK
    text categoria
    int numero
    text titulo
    int peso
    int ordem
    int reincidencia
    int ativo
  }
  checklist_itens {
    bigint id PK
    bigint secao_id FK
    text codigo
    text descricao
    int ordem
    int ativo
  }
  checklist_disciplinas {
    bigint id PK
    text nome
    int ordem
    int ativo
  }
  checklist_entregas {
    bigint id PK
    bigint obra_id FK
    bigint data_vistoria
    numeric metragem_m2
    text gc
    text go
    checklist_condicao condicao
    int total_itens
    uuid created_by_id
    text created_by_name
  }
  checklist_entrega_itens {
    bigint id PK
    bigint entrega_id FK
    bigint disciplina_id FK
    text disciplina_nome
    bigint fornecedor_id FK
    text fornecedor_nome
    text equipe_nome
    checklist_avaliacao avaliacao
    text comentarios
    int ordem
  }
  checklist_entrega_fotos {
    bigint id PK
    bigint item_id FK
    bigint foto_evidencia_id
    text url
    text legenda
    int ordem
  }
  checklist_fornecedor_equipe {
    bigint id PK
    bigint fornecedor_id FK
    text fornecedor_nome
    text nome_equipe
    text disciplina
  }
  config_faixas {
    bigint id PK
    text categoria
    text nome
    int minimo
    int maximo
    text cor
    int ordem
  }
  alocacoes {
    bigint id PK
    bigint obra_id FK
    bigint membro_id FK
    date data
    vertical vertical
    alocacao_status status
    text observacao
    uuid created_by
  }
  membros_equipe {
    bigint id PK
    uuid user_id
    text nome
    text email
    text telefone
    cargo cargo
    jsonb obra_ids
    int ativo
  }
  profiles {
    uuid id PK
    text name
    text email
  }
  user_roles {
    uuid id PK
    uuid user_id FK
    app_role role
  }
  notificacoes {
    bigint id PK
    uuid user_id FK
    text titulo
    text mensagem
    tipo_notificacao tipo
    bigint referencia_id
    ref_tipo referencia_tipo
    int lida
  }

  obras ||--o{ edificios : "possui"
  edificios ||--o{ andares : "possui"
  obras ||--o{ plantas : "possui"
  andares ||--o{ plantas : "do andar"
  plantas ||--o{ planta_ambientes : "contem"
  obras ||--o{ desvios : "registra"
  plantas ||--o{ desvios : "localizado"
  grupos ||--o{ desvios : "agrupa"
  fornecedores ||--o{ desvios : "responsavel"
  desvios ||--o{ fotos_evidencia : "possui"
  desvios ||--o{ historico : "possui"
  desvios ||--o{ desvio_aprovacoes : "possui"
  desvios ||--o{ plano_desvios : "vinculado"
  planos_acao ||--o{ plano_desvios : "vinculado"
  plano_categorias ||--o{ planos_acao : "classifica"
  obras ||--o{ planos_acao : "escopo"
  ocorrencias ||--o{ planos_acao : "gera"
  obras ||--o{ ocorrencias : "ocorre"
  ocorrencias ||--o{ ocorrencia_causas : "possui"
  ocorrencias ||--o{ ocorrencia_comissao : "possui"
  ocorrencias ||--o{ ocorrencia_cronologia : "possui"
  ocorrencias ||--o{ ocorrencia_documentos : "possui"
  ocorrencias ||--o{ ocorrencia_fotos : "possui"
  ocorrencias ||--o{ ocorrencia_porques : "possui"
  ocorrencias ||--o{ ocorrencia_testemunhas : "possui"
  obras ||--o{ verificacoes : "recebe"
  verificacoes ||--o{ verificacao_respostas : "possui"
  verificacoes ||--o{ verificacao_resposta_fotos : "possui"
  checklist_itens ||--o{ verificacao_respostas : "avalia"
  checklist_secoes ||--o{ checklist_itens : "possui"
  obras ||--o{ checklist_entregas : "possui"
  checklist_entregas ||--o{ checklist_entrega_itens : "contem"
  checklist_disciplinas ||--o{ checklist_entrega_itens : "disciplina"
  fornecedores ||--o{ checklist_entrega_itens : "executa"
  checklist_entrega_itens ||--o{ checklist_entrega_fotos : "possui"
  fornecedores ||--o{ checklist_fornecedor_equipe : "possui"
  obras ||--o{ alocacoes : "possui"
  membros_equipe ||--o{ alocacoes : "alocado"
  profiles ||--o{ user_roles : "possui"
  profiles ||--o{ notificacoes : "recebe"
`;

export default function Sistema() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!ref.current) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "neutral",
      securityLevel: "loose",
      er: { useMaxWidth: false, entityPadding: 12, fontSize: 12 },
      themeVariables: {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
    });
    const id = `er-${Date.now()}`;
    mermaid
      .render(id, DIAGRAM)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => {
        if (ref.current)
          ref.current.innerHTML = `<pre class="text-destructive text-xs">${String(e)}</pre>`;
      });
  }, [theme]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Diagrama entidade-relacionamento (tabelas, colunas e relações).
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4 overflow-auto max-h-[calc(100vh-12rem)]">
        <div
          ref={ref}
          className="origin-top-left transition-transform"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  );
}
