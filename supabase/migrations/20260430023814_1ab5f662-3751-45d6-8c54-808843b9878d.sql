ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS cobertura_qualidade integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cobertura_checklist integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cobertura_qsms      integer NOT NULL DEFAULT 0;

UPDATE public.obras
SET cobertura_qualidade = cobertura,
    cobertura_checklist = cobertura,
    cobertura_qsms      = cobertura
WHERE cobertura IS NOT NULL;