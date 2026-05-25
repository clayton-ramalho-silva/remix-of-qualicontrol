
-- 1) Renumerar ids sequencialmente começando em 1, mantendo ordem por id atual
WITH ordered AS (
  SELECT id AS old_id,
         ROW_NUMBER() OVER (ORDER BY id) AS new_id
  FROM public.grupos
)
UPDATE public.grupos g
   SET id = -o.new_id
  FROM ordered o
 WHERE g.id = o.old_id;

UPDATE public.grupos SET id = -id WHERE id < 0;

-- 2) Resetar a sequência para continuar do próximo valor
SELECT setval(
  pg_get_serial_sequence('public.grupos', 'id'),
  COALESCE((SELECT MAX(id) FROM public.grupos), 0) + 1,
  false
);

-- 3) Garantir unicidade do código para que o upsert da sync use ON CONFLICT (codigo)
CREATE UNIQUE INDEX IF NOT EXISTS grupos_codigo_unique ON public.grupos (codigo);
