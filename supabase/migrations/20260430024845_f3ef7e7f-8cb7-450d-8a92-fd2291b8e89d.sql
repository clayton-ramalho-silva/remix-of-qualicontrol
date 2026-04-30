-- Enums
DO $$ BEGIN
  CREATE TYPE public.alocacao_status AS ENUM ('pendente', 'cumprido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.alocacoes (
  id           bigserial PRIMARY KEY,
  membro_id    bigint NOT NULL,
  obra_id      bigint NOT NULL,
  vertical     public.origem_desvio NOT NULL,
  data         date NOT NULL,
  status       public.alocacao_status NOT NULL DEFAULT 'pendente',
  observacao   text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alocacoes_data     ON public.alocacoes (data);
CREATE INDEX IF NOT EXISTS idx_alocacoes_obra     ON public.alocacoes (obra_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_membro   ON public.alocacoes (membro_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_vertical ON public.alocacoes (vertical);

-- Trigger updated_at (função já existe: public.set_updated_at)
DROP TRIGGER IF EXISTS trg_alocacoes_updated_at ON public.alocacoes;
CREATE TRIGGER trg_alocacoes_updated_at
  BEFORE UPDATE ON public.alocacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.alocacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth all alocacoes" ON public.alocacoes;
CREATE POLICY "auth all alocacoes"
  ON public.alocacoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);