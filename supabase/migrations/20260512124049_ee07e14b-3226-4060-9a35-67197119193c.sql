ALTER TABLE public.desvios
  ADD COLUMN IF NOT EXISTS tag_solicitado_gerenciadora integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tag_solicitado_arquitetura integer NOT NULL DEFAULT 0;