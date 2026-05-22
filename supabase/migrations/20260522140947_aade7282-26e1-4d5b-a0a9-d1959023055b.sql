ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS id_projeto bigint,
  ADD COLUMN IF NOT EXISTS data_criacao timestamptz,
  ADD COLUMN IF NOT EXISTS data_atualizacao timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS obras_id_projeto_key ON public.obras (id_projeto) WHERE id_projeto IS NOT NULL;