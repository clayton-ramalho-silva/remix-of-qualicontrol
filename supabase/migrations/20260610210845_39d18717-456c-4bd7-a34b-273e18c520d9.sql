
CREATE TABLE public.user_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  draft_id text NOT NULL,
  data jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, draft_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_drafts TO authenticated;
GRANT ALL ON public.user_drafts TO service_role;

ALTER TABLE public.user_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drafts"
  ON public.user_drafts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX user_drafts_user_scope_idx ON public.user_drafts (user_id, scope);

CREATE TRIGGER user_drafts_set_updated_at
  BEFORE UPDATE ON public.user_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
