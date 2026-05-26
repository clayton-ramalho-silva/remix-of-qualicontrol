ALTER TABLE public.fornecedores_disciplinas
  ADD CONSTRAINT fornecedores_disciplinas_unique UNIQUE (fornecedor_id, disciplina_id);

ALTER TABLE public.fornecedores_grupos
  ADD CONSTRAINT fornecedores_grupos_unique UNIQUE (fornecedor_id, grupo_id);

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_id_fornecedor_unique
  ON public.fornecedores(id_fornecedor) WHERE id_fornecedor IS NOT NULL;