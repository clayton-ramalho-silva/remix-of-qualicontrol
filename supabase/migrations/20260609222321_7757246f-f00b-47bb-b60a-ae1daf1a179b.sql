
ALTER TABLE public.verificacoes
  ADD COLUMN IF NOT EXISTS planta_url text,
  ADD COLUMN IF NOT EXISTS planta_file_key text;

ALTER TABLE public.verificacao_resposta_fotos
  ADD COLUMN IF NOT EXISTS pin_x numeric,
  ADD COLUMN IF NOT EXISTS pin_y numeric;
