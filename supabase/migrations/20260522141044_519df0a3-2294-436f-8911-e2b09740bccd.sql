DROP INDEX IF EXISTS public.obras_id_projeto_key;
ALTER TABLE public.obras ADD CONSTRAINT obras_id_projeto_key UNIQUE (id_projeto);