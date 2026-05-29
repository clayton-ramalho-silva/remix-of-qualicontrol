DROP POLICY IF EXISTS "admin insert plano_categorias" ON public.plano_categorias;
DROP POLICY IF EXISTS "admin update plano_categorias" ON public.plano_categorias;
DROP POLICY IF EXISTS "admin delete plano_categorias" ON public.plano_categorias;

CREATE POLICY "auth insert plano_categorias" ON public.plano_categorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update plano_categorias" ON public.plano_categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete plano_categorias" ON public.plano_categorias FOR DELETE TO authenticated USING (true);