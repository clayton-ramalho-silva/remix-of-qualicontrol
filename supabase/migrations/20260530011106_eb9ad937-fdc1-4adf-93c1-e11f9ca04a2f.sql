-- Status de rascunho para vistorias e checklist de entrega
ALTER TABLE public.verificacoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'finalizado';

ALTER TABLE public.checklist_entregas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'finalizado';

-- Em ocorrencias já existe um campo status próprio (comunicado/etc.), então usamos flag separada
ALTER TABLE public.ocorrencias
  ADD COLUMN IF NOT EXISTS is_rascunho integer NOT NULL DEFAULT 0;

-- Índices para a lista filtrar rapidamente
CREATE INDEX IF NOT EXISTS idx_verificacoes_status ON public.verificacoes(status);
CREATE INDEX IF NOT EXISTS idx_checklist_entregas_status ON public.checklist_entregas(status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_is_rascunho ON public.ocorrencias(is_rascunho);

-- Tabela de auditoria de fotos órfãs no Storage
CREATE TABLE IF NOT EXISTS public.storage_orphans (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  file_key text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  UNIQUE (bucket, file_key)
);

GRANT SELECT ON public.storage_orphans TO authenticated;
GRANT ALL ON public.storage_orphans TO service_role;

ALTER TABLE public.storage_orphans ENABLE ROW LEVEL SECURITY;

-- Apenas admins enxergam a lista de órfãos
CREATE POLICY "admins read storage_orphans"
ON public.storage_orphans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
