
CREATE TABLE public.edificios (
  id BIGSERIAL PRIMARY KEY,
  obra_id BIGINT NOT NULL,
  nome TEXT NOT NULL,
  codigo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_edificios_obra ON public.edificios(obra_id);
ALTER TABLE public.edificios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all edificios" ON public.edificios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_edificios_updated_at BEFORE UPDATE ON public.edificios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.andares (
  id BIGSERIAL PRIMARY KEY,
  edificio_id BIGINT NOT NULL REFERENCES public.edificios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  numero INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_andares_edificio ON public.andares(edificio_id);
ALTER TABLE public.andares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all andares" ON public.andares FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_andares_updated_at BEFORE UPDATE ON public.andares FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plantas ADD COLUMN andar_id BIGINT REFERENCES public.andares(id) ON DELETE SET NULL;
CREATE INDEX idx_plantas_andar ON public.plantas(andar_id);
