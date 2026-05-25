CREATE TABLE public.disciplinas (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  id_disciplina BIGINT NOT NULL UNIQUE,
  id_grupo BIGINT NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disciplinas_id_grupo ON public.disciplinas(id_grupo);

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all disciplinas" ON public.disciplinas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_disciplinas_updated_at
  BEFORE UPDATE ON public.disciplinas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();