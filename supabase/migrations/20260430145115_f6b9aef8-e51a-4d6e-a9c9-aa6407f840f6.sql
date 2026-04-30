CREATE TABLE IF NOT EXISTS public.verificacao_resposta_fotos (
  id BIGSERIAL PRIMARY KEY,
  verificacao_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  file_key TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vrf_verificacao ON public.verificacao_resposta_fotos(verificacao_id);
CREATE INDEX IF NOT EXISTS idx_vrf_item ON public.verificacao_resposta_fotos(verificacao_id, item_id);

ALTER TABLE public.verificacao_resposta_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all vrf" ON public.verificacao_resposta_fotos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);