
-- 1) profiles: usuários só leem o próprio perfil
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2) notificacoes: insert restrito ao próprio user_id
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
CREATE POLICY "Users insert own notif"
  ON public.notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) set_updated_at: fixar search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 4) Revogar execução pública de funções SECURITY DEFINER de uso interno
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
