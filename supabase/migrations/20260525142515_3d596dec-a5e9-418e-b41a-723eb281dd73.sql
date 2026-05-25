-- 1) Add id_fornecedor to fornecedores
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS id_fornecedor BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS fornecedores_id_fornecedor_key
  ON public.fornecedores(id_fornecedor)
  WHERE id_fornecedor IS NOT NULL;

-- 2) Pivot fornecedores_grupos
CREATE TABLE IF NOT EXISTS public.fornecedores_grupos (
  id BIGSERIAL PRIMARY KEY,
  fornecedor_id BIGINT NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  grupo_id BIGINT NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, grupo_id)
);
CREATE INDEX IF NOT EXISTS idx_fg_fornecedor ON public.fornecedores_grupos(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_fg_grupo ON public.fornecedores_grupos(grupo_id);

ALTER TABLE public.fornecedores_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fornecedores_grupos" ON public.fornecedores_grupos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) Pivot fornecedores_disciplinas
CREATE TABLE IF NOT EXISTS public.fornecedores_disciplinas (
  id BIGSERIAL PRIMARY KEY,
  fornecedor_id BIGINT NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  disciplina_id BIGINT NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, disciplina_id)
);
CREATE INDEX IF NOT EXISTS idx_fd_fornecedor ON public.fornecedores_disciplinas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_fd_disciplina ON public.fornecedores_disciplinas(disciplina_id);

ALTER TABLE public.fornecedores_disciplinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fornecedores_disciplinas" ON public.fornecedores_disciplinas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);