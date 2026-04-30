-- Adiciona categoria em verificacoes (separar Qualidade de Vistoria de Recebimento)
ALTER TABLE public.verificacoes ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'qualidade';
CREATE INDEX IF NOT EXISTS idx_verificacoes_categoria ON public.verificacoes(categoria);

-- Adiciona categoria em config_faixas para permitir faixas próprias por vertical
ALTER TABLE public.config_faixas ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'qualidade';
CREATE INDEX IF NOT EXISTS idx_config_faixas_categoria ON public.config_faixas(categoria);

-- Cria 4 faixas vazias para categoria 'vistoria' (mesma estrutura padrão), iniciando com mesmas faixas para o usuário ajustar.
INSERT INTO public.config_faixas (nome, minimo, maximo, cor, ordem, categoria)
SELECT nome, minimo, maximo, cor, ordem, 'vistoria'
FROM public.config_faixas
WHERE categoria = 'qualidade'
AND NOT EXISTS (SELECT 1 FROM public.config_faixas WHERE categoria = 'vistoria');