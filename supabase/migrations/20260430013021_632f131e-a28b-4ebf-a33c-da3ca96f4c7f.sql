ALTER TABLE public.checklist_secoes ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'qualidade';

UPDATE public.checklist_secoes SET categoria = 'qualidade'
  WHERE titulo IN ('Estrutura e Concretagem','Alvenaria e Vedações','Instalações Elétricas','Instalações Hidráulicas','Impermeabilização','Acabamentos');

UPDATE public.checklist_secoes SET categoria = 'condicao'
  WHERE titulo IN ('Segurança do Trabalho','Organização e Limpeza');