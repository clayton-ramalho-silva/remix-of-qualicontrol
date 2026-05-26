CREATE TABLE public.obras_fornecedores (
  id BIGSERIAL PRIMARY KEY,
  obra_id BIGINT NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  fornecedor_id BIGINT NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (obra_id, fornecedor_id)
);

CREATE INDEX idx_obras_fornecedores_obra ON public.obras_fornecedores(obra_id);
CREATE INDEX idx_obras_fornecedores_fornecedor ON public.obras_fornecedores(fornecedor_id);

ALTER TABLE public.obras_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all obras_fornecedores"
ON public.obras_fornecedores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);