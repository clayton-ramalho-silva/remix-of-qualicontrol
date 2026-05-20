-- Tabela de log de sincronizações com a API externa
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity TEXT NOT NULL, -- 'obras' | 'fornecedores'
  status TEXT NOT NULL, -- 'success' | 'error'
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_total INTEGER DEFAULT 0,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para consultas por entidade e data
CREATE INDEX IF NOT EXISTS sync_logs_entity_idx ON public.sync_logs(entity);
CREATE INDEX IF NOT EXISTS sync_logs_executed_at_idx ON public.sync_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS sync_logs_status_idx ON public.sync_logs(status);

-- RLS habilitado mas somente leitura para usuários autenticados
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read sync_logs"
  ON public.sync_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Comentários
COMMENT ON TABLE public.sync_logs IS 'Log de execuções de sincronização com APIs externas';
COMMENT ON COLUMN public.sync_logs.entity IS 'Entidade sincronizada: obras, fornecedores';
COMMENT ON COLUMN public.sync_logs.status IS 'Resultado da sync: success ou error';
COMMENT ON COLUMN public.sync_logs.records_inserted IS 'Quantidade de registros novos inseridos';
COMMENT ON COLUMN public.sync_logs.records_updated IS 'Quantidade de registros existentes atualizados';
COMMENT ON COLUMN public.sync_logs.records_total IS 'Total de registros processados da API';
COMMENT ON COLUMN public.sync_logs.error_message IS 'Mensagem de erro em caso de falha';