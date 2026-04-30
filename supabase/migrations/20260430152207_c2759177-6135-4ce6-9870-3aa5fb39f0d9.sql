CREATE TABLE IF NOT EXISTS public.plano_desvios (
  id BIGSERIAL PRIMARY KEY,
  plano_id BIGINT NOT NULL,
  desvio_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plano_id, desvio_id)
);

CREATE INDEX IF NOT EXISTS idx_plano_desvios_plano ON public.plano_desvios(plano_id);
CREATE INDEX IF NOT EXISTS idx_plano_desvios_desvio ON public.plano_desvios(desvio_id);

ALTER TABLE public.plano_desvios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read plano_desvios"
  ON public.plano_desvios FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "auth write plano_desvios"
  ON public.plano_desvios FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "auth delete plano_desvios"
  ON public.plano_desvios FOR DELETE
  TO authenticated USING (true);

-- Migrar vínculos existentes
INSERT INTO public.plano_desvios (plano_id, desvio_id)
SELECT id, desvio_id FROM public.planos_acao
WHERE desvio_id IS NOT NULL
ON CONFLICT (plano_id, desvio_id) DO NOTHING;