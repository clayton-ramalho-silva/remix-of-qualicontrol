-- Tabela de ambientes detectados/cadastrados por planta
CREATE TABLE public.planta_ambientes (
  id BIGSERIAL PRIMARY KEY,
  planta_id BIGINT NOT NULL,
  pavimento TEXT,
  numero TEXT,
  nome TEXT NOT NULL,
  pin_x NUMERIC,
  pin_y NUMERIC,
  origem TEXT NOT NULL DEFAULT 'ia', -- 'ia' | 'manual'
  revisado INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planta_ambientes_planta ON public.planta_ambientes(planta_id);

ALTER TABLE public.planta_ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all planta_ambientes" ON public.planta_ambientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at_planta_ambientes
  BEFORE UPDATE ON public.planta_ambientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Status de extração no nível da planta
ALTER TABLE public.plantas
  ADD COLUMN IF NOT EXISTS extracao_status TEXT NOT NULL DEFAULT 'pendente', -- pendente | processando | concluido | erro | revisado
  ADD COLUMN IF NOT EXISTS extracao_erro TEXT,
  ADD COLUMN IF NOT EXISTS extracao_at TIMESTAMPTZ;