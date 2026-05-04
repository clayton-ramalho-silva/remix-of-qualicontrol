
-- 1. Tornar desvio_id opcional em planos_acao
ALTER TABLE public.planos_acao ALTER COLUMN desvio_id DROP NOT NULL;

-- 2. Enum tipo_plano
DO $$ BEGIN
  CREATE TYPE public.tipo_plano AS ENUM ('corretivo', 'preventivo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Novas colunas em planos_acao
ALTER TABLE public.planos_acao
  ADD COLUMN IF NOT EXISTS tipo public.tipo_plano NOT NULL DEFAULT 'corretivo',
  ADD COLUMN IF NOT EXISTS vertical public.origem_desvio,
  ADD COLUMN IF NOT EXISTS obra_id bigint,
  ADD COLUMN IF NOT EXISTS categoria_id bigint;

-- 4. Tabela de categorias de planos preventivos
CREATE TABLE IF NOT EXISTS public.plano_categorias (
  id bigserial PRIMARY KEY,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.plano_categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read plano_categorias" ON public.plano_categorias;
CREATE POLICY "auth read plano_categorias" ON public.plano_categorias
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin insert plano_categorias" ON public.plano_categorias;
CREATE POLICY "admin insert plano_categorias" ON public.plano_categorias
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin update plano_categorias" ON public.plano_categorias;
CREATE POLICY "admin update plano_categorias" ON public.plano_categorias
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin delete plano_categorias" ON public.plano_categorias;
CREATE POLICY "admin delete plano_categorias" ON public.plano_categorias
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_plano_categorias_updated_at ON public.plano_categorias;
CREATE TRIGGER trg_plano_categorias_updated_at
  BEFORE UPDATE ON public.plano_categorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Seed de categorias iniciais
INSERT INTO public.plano_categorias (nome, ordem) VALUES
  ('Treinamento', 1),
  ('Auditoria', 2),
  ('Melhoria de processo', 3),
  ('Compra / EPI', 4),
  ('Manutenção preventiva', 5),
  ('Outro', 99)
ON CONFLICT DO NOTHING;
