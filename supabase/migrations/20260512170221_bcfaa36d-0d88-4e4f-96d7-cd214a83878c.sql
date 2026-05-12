ALTER TYPE public.origem_desvio ADD VALUE IF NOT EXISTS 'vistoria';
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS cobertura_vistoria integer NOT NULL DEFAULT 0;