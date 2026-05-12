-- Soft delete columns
ALTER TABLE public.desvios
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_id uuid NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_name text NULL;

CREATE INDEX IF NOT EXISTS desvios_deleted_at_idx ON public.desvios (deleted_at);

-- Hard delete the test desvio #153
DELETE FROM public.plano_desvios     WHERE desvio_id = 153;
DELETE FROM public.fotos_evidencia   WHERE desvio_id = 153;
DELETE FROM public.desvio_aprovacoes WHERE desvio_id = 153;
DELETE FROM public.historico         WHERE desvio_id = 153;
DELETE FROM public.planos_acao       WHERE desvio_id = 153;
DELETE FROM public.desvios           WHERE id = 153;