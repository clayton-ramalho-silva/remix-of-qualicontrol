
-- Enums
CREATE TYPE public.checklist_condicao AS ENUM ('ruim','regular','otima');
CREATE TYPE public.checklist_avaliacao AS ENUM ('ok','atencao','critico');

-- Catálogo de disciplinas
CREATE TABLE public.checklist_disciplinas (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_disciplinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read disc" ON public.checklist_disciplinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write disc" ON public.checklist_disciplinas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin update disc" ON public.checklist_disciplinas FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin delete disc" ON public.checklist_disciplinas FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- Seed disciplinas
INSERT INTO public.checklist_disciplinas (nome, ordem) VALUES
  ('Pedra',10),('Forro Modular',20),('Dados / Voz',30),('Vidro',40),
  ('Limpeza Fina',50),('Elétrica',60),('SDAI',70),('Hidráulica / SPK',80),
  ('Drywall',90),('Civil',100),('Pintura',110),('Rodapé',120),
  ('Vinílico / Carpete / Piso Elevado',130),('Marcenaria',140),('Carpete',150),
  ('Serralheria',160),('Divisória Industrial',170),('Luminária',180),('Ar Condicionado',190);

-- Relação fornecedor <-> equipe
CREATE TABLE public.checklist_fornecedor_equipe (
  id BIGSERIAL PRIMARY KEY,
  fornecedor_id BIGINT,
  fornecedor_nome TEXT NOT NULL,
  nome_equipe TEXT NOT NULL,
  disciplina TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_nome, nome_equipe)
);
ALTER TABLE public.checklist_fornecedor_equipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fe" ON public.checklist_fornecedor_equipe FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cabeçalho
CREATE TABLE public.checklist_entregas (
  id BIGSERIAL PRIMARY KEY,
  obra_id BIGINT NOT NULL,
  data_vistoria BIGINT NOT NULL,
  metragem_m2 NUMERIC,
  gc TEXT,
  go TEXT,
  condicao checklist_condicao NOT NULL DEFAULT 'regular',
  total_itens INTEGER NOT NULL DEFAULT 0,
  created_by_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all ent" ON public.checklist_entregas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Itens (linhas do grid)
CREATE TABLE public.checklist_entrega_itens (
  id BIGSERIAL PRIMARY KEY,
  entrega_id BIGINT NOT NULL REFERENCES public.checklist_entregas(id) ON DELETE CASCADE,
  disciplina_id BIGINT,
  disciplina_nome TEXT NOT NULL,
  fornecedor_id BIGINT,
  fornecedor_nome TEXT,
  equipe_nome TEXT,
  avaliacao checklist_avaliacao NOT NULL DEFAULT 'ok',
  comentarios TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_entrega_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all enti" ON public.checklist_entrega_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fotos por item
CREATE TABLE public.checklist_entrega_fotos (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES public.checklist_entrega_itens(id) ON DELETE CASCADE,
  foto_evidencia_id BIGINT,
  url TEXT NOT NULL,
  legenda TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_entrega_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all entf" ON public.checklist_entrega_fotos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_disc_updated BEFORE UPDATE ON public.checklist_disciplinas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ent_updated BEFORE UPDATE ON public.checklist_entregas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
