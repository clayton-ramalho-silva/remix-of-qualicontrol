
-- Enums
CREATE TYPE classificacao_ocorrencia AS ENUM ('incidente','incidente_ambiental','aca','asa','af','at');
CREATE TYPE status_ocorrencia AS ENUM ('comunicado','em_investigacao','em_analise','acao_em_andamento','encerrado');
CREATE TYPE tipo_causa_ocorrencia AS ENUM ('imediata','basica');
CREATE TYPE categoria_causa_ocorrencia AS ENUM ('ato_abaixo_padrao','condicao_abaixo_padrao','fator_pessoal','fator_trabalho');
CREATE TYPE etapa_foto_ocorrencia AS ENUM ('cena','simulacao','evidencia','plano');
CREATE TYPE tipo_doc_ocorrencia AS ENUM ('cat','atestado','awfor149','memorando','outro');

-- Tabela principal
CREATE TABLE public.ocorrencias (
  id bigserial PRIMARY KEY,
  obra_id bigint NOT NULL,
  data_ocorrencia bigint NOT NULL,
  hora text,
  local_ocorrencia text,
  endereco text,
  cidade text,
  uf text,
  empresa_principal text,
  cnpj_principal text,
  empresa_subcontratada text,
  cnpj_subcontratada text,
  acidentado_nome text,
  acidentado_funcao text,
  acidentado_idade integer,
  classificacao classificacao_ocorrencia NOT NULL,
  descricao_preliminar text NOT NULL,
  acao_imediata text,
  responsavel_preenchimento text,
  responsavel_obra text,
  cat_emitida integer NOT NULL DEFAULT 0,
  cat_numero text,
  atestado_dias integer,
  awfor149_anexada integer NOT NULL DEFAULT 0,
  status status_ocorrencia NOT NULL DEFAULT 'comunicado',
  prazo_comissao bigint,
  prazo_investigacao bigint,
  prazo_plano bigint,
  data_fechamento bigint,
  observacoes text,
  created_by_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_comissao (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  papel text,
  is_coordenador integer NOT NULL DEFAULT 0,
  contato text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_testemunhas (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  identidade text,
  contato text,
  depoimento text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_cronologia (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  etapa text NOT NULL,
  momento text,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_causas (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  tipo tipo_causa_ocorrencia NOT NULL,
  categoria categoria_causa_ocorrencia,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_porques (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  parent_id bigint REFERENCES public.ocorrencia_porques(id) ON DELETE CASCADE,
  nivel integer NOT NULL DEFAULT 1,
  pergunta text,
  resposta text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_fotos (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  file_key text NOT NULL,
  url text NOT NULL,
  descricao text,
  etapa etapa_foto_ocorrencia NOT NULL DEFAULT 'cena',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ocorrencia_documentos (
  id bigserial PRIMARY KEY,
  ocorrencia_id bigint NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  file_key text NOT NULL,
  url text NOT NULL,
  tipo tipo_doc_ocorrencia NOT NULL DEFAULT 'outro',
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vínculo opcional de planos de ação à ocorrência
ALTER TABLE public.planos_acao ADD COLUMN IF NOT EXISTS ocorrencia_id bigint;

-- RLS
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_testemunhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_cronologia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_porques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencia_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all ocorrencias" ON public.ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_comissao" ON public.ocorrencia_comissao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_testemunhas" ON public.ocorrencia_testemunhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_cronologia" ON public.ocorrencia_cronologia FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_causas" ON public.ocorrencia_causas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_porques" ON public.ocorrencia_porques FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_fotos" ON public.ocorrencia_fotos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all ocorrencia_documentos" ON public.ocorrencia_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER trg_ocorrencias_updated_at BEFORE UPDATE ON public.ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ocorrencias_obra ON public.ocorrencias(obra_id);
CREATE INDEX idx_ocorrencias_status ON public.ocorrencias(status);
CREATE INDEX idx_ocorrencia_fotos_oc ON public.ocorrencia_fotos(ocorrencia_id);
CREATE INDEX idx_ocorrencia_docs_oc ON public.ocorrencia_documentos(ocorrencia_id);
CREATE INDEX idx_planos_acao_ocorrencia ON public.planos_acao(ocorrencia_id);
