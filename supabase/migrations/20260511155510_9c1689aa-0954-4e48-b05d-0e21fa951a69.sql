
ALTER TABLE public.membros_equipe ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS membros_equipe_user_id_key ON public.membros_equipe(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS membros_equipe_email_idx ON public.membros_equipe(lower(email));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  -- Ligar automaticamente a membro existente com mesmo email
  UPDATE public.membros_equipe
     SET user_id = NEW.id, updated_at = now()
   WHERE user_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$function$;
