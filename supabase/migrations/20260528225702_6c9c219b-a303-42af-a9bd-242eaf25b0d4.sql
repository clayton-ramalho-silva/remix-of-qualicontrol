ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS gerente_obra text,
  ADD COLUMN IF NOT EXISTS gerente_contrato text,
  ADD COLUMN IF NOT EXISTS nucleo text;