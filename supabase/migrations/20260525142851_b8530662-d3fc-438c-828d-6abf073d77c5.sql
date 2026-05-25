DROP INDEX IF EXISTS public.fornecedores_id_fornecedor_key;
ALTER TABLE public.fornecedores
  ADD CONSTRAINT fornecedores_id_fornecedor_key UNIQUE (id_fornecedor);