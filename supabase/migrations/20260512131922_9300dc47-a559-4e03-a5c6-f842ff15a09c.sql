
DO $$ BEGIN
  CREATE TYPE public.tipo_aprovacao AS ENUM ('gerenciadora', 'arquitetura');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.decisao_aprovacao AS ENUM ('aprovado', 'reprovado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.desvio_aprovacoes (
  id BIGSERIAL PRIMARY KEY,
  desvio_id BIGINT NOT NULL,
  tipo public.tipo_aprovacao NOT NULL,
  decisao public.decisao_aprovacao NOT NULL,
  aprovador_id UUID NOT NULL,
  aprovador_nome TEXT,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desvio_aprovacoes_desvio ON public.desvio_aprovacoes(desvio_id);
CREATE INDEX IF NOT EXISTS idx_desvio_aprovacoes_tipo ON public.desvio_aprovacoes(tipo);

ALTER TABLE public.desvio_aprovacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read aprovacoes" ON public.desvio_aprovacoes;
CREATE POLICY "auth read aprovacoes" ON public.desvio_aprovacoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "aprovador insert aprovacoes" ON public.desvio_aprovacoes;
CREATE POLICY "aprovador insert aprovacoes" ON public.desvio_aprovacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    aprovador_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (tipo = 'gerenciadora' AND public.has_role(auth.uid(), 'aprovador_gerenciadora'::public.app_role))
      OR (tipo = 'arquitetura'  AND public.has_role(auth.uid(), 'aprovador_arquitetura'::public.app_role))
    )
  );
