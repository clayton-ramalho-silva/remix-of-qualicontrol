-- Adiciona campos externos na tabela obras
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS id_externo INTEGER,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS complemento_endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT;

-- Index no id_externo para performance no upsert
CREATE UNIQUE INDEX IF NOT EXISTS obras_id_externo_idx 
  ON public.obras(id_externo) 
  WHERE id_externo IS NOT NULL;

-- Comentários documentando o de-para com a API
COMMENT ON COLUMN public.obras.id_externo IS 'IdProjeto - identificador único na API externa';
COMMENT ON COLUMN public.obras.cidade IS 'Cidade - vindo da API externa';
COMMENT ON COLUMN public.obras.complemento_endereco IS 'ComplementoEndereco - vindo da API externa';
COMMENT ON COLUMN public.obras.bairro IS 'Bairro - vindo da API externa';
COMMENT ON COLUMN public.obras.cep IS 'Cep - vindo da API externa';