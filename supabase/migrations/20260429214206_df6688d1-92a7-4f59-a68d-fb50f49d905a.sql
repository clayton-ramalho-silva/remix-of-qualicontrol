-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.status_obra AS ENUM ('ativa', 'concluida', 'pausada');
CREATE TYPE public.cargo_membro AS ENUM ('avaliador','gerente_obra','gerente_contrato','nucleo','diretoria','coordenador','tecnico');
CREATE TYPE public.severidade_desvio AS ENUM ('leve','moderado','grave');
CREATE TYPE public.origem_desvio AS ENUM ('qualidade','punch_list','pos_obra');
CREATE TYPE public.status_desvio AS ENUM ('aberto','em_andamento','fechado','aguardando_aceite');
CREATE TYPE public.tipo_foto AS ENUM ('abertura','fechamento');
CREATE TYPE public.responsavel_tipo AS ENUM ('membro','fornecedor');
CREATE TYPE public.prioridade_plano AS ENUM ('urgente','normal','baixa');
CREATE TYPE public.status_plano AS ENUM ('pendente','em_andamento','concluido');
CREATE TYPE public.tipo_historico AS ENUM ('criacao','status','edicao','plano_acao','comentario','foto');
CREATE TYPE public.resposta_verificacao AS ENUM ('AT','NAT','GR','NA');
CREATE TYPE public.tipo_notificacao AS ENUM ('plano_criado','prazo_vencendo','plano_atrasado','status_alterado','verificacao','geral');
CREATE TYPE public.referencia_tipo AS ENUM ('desvio','plano','verificacao');

-- ============ TIMESTAMPS HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ AUTO PROFILE TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ POLICY HELPER (autenticado pode tudo) ============
-- Aplicada a tabelas operacionais

-- ============ OBRAS ============
CREATE TABLE public.obras (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  cliente TEXT,
  endereco TEXT,
  status status_obra NOT NULL DEFAULT 'ativa',
  cobertura INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all obras" ON public.obras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_obras_uat BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FORNECEDORES ============
CREATE TABLE public.fornecedores (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  disciplina TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fornecedores_uat BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MEMBROS EQUIPE ============
CREATE TABLE public.membros_equipe (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cargo cargo_membro NOT NULL,
  obra_ids JSONB,
  ativo INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.membros_equipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all membros" ON public.membros_equipe FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_membros_uat BEFORE UPDATE ON public.membros_equipe FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GRUPOS ============
CREATE TABLE public.grupos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all grupos" ON public.grupos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_grupos_uat BEFORE UPDATE ON public.grupos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PLANTAS ============
CREATE TABLE public.plantas (
  id BIGSERIAL PRIMARY KEY,
  obra_id BIGINT NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  file_key TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plantas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all plantas" ON public.plantas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_plantas_uat BEFORE UPDATE ON public.plantas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DESVIOS ============
CREATE TABLE public.desvios (
  id BIGSERIAL PRIMARY KEY,
  obra_id BIGINT NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  disciplina TEXT,
  grupo_id BIGINT REFERENCES public.grupos(id) ON DELETE SET NULL,
  fornecedor_id BIGINT REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome TEXT,
  descricao TEXT NOT NULL,
  localizacao TEXT,
  severidade severidade_desvio NOT NULL,
  origem origem_desvio NOT NULL DEFAULT 'qualidade',
  tag_critico INT NOT NULL DEFAULT 0,
  tag_seguranca_trabalho INT NOT NULL DEFAULT 0,
  tag_solicitado_cliente INT NOT NULL DEFAULT 0,
  status status_desvio NOT NULL DEFAULT 'aberto',
  data_identificacao BIGINT NOT NULL,
  prazo_sugerido BIGINT,
  data_fechamento BIGINT,
  planta_id BIGINT REFERENCES public.plantas(id) ON DELETE SET NULL,
  pin_x DECIMAL(8,4),
  pin_y DECIMAL(8,4),
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.desvios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all desvios" ON public.desvios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_desvios_uat BEFORE UPDATE ON public.desvios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FOTOS EVIDENCIA ============
CREATE TABLE public.fotos_evidencia (
  id BIGSERIAL PRIMARY KEY,
  desvio_id BIGINT NOT NULL REFERENCES public.desvios(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  file_key TEXT NOT NULL,
  descricao TEXT,
  tipo tipo_foto NOT NULL DEFAULT 'abertura',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fotos_evidencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all fotos" ON public.fotos_evidencia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ PLANOS ACAO ============
CREATE TABLE public.planos_acao (
  id BIGSERIAL PRIMARY KEY,
  desvio_id BIGINT NOT NULL REFERENCES public.desvios(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  responsavel_tipo responsavel_tipo NOT NULL DEFAULT 'membro',
  responsavel_id BIGINT,
  responsavel_email TEXT,
  prioridade prioridade_plano NOT NULL DEFAULT 'normal',
  prazo BIGINT NOT NULL,
  status status_plano NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  notificado_em BIGINT,
  lembrete_enviado INT NOT NULL DEFAULT 0,
  alerta_atraso_enviado INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planos_acao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all planos" ON public.planos_acao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planos_uat BEFORE UPDATE ON public.planos_acao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HISTORICO ============
CREATE TABLE public.historico (
  id BIGSERIAL PRIMARY KEY,
  desvio_id BIGINT NOT NULL REFERENCES public.desvios(id) ON DELETE CASCADE,
  tipo tipo_historico NOT NULL,
  descricao TEXT NOT NULL,
  de TEXT,
  para TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all historico" ON public.historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ CHECKLIST SECOES / ITENS ============
CREATE TABLE public.checklist_secoes (
  id BIGSERIAL PRIMARY KEY,
  numero INT NOT NULL,
  titulo TEXT NOT NULL,
  peso INT NOT NULL DEFAULT 10,
  reincidencia INT NOT NULL DEFAULT 0,
  ordem INT NOT NULL,
  ativo INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_secoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all secoes" ON public.checklist_secoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_secoes_uat BEFORE UPDATE ON public.checklist_secoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.checklist_itens (
  id BIGSERIAL PRIMARY KEY,
  secao_id BIGINT NOT NULL REFERENCES public.checklist_secoes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ordem INT NOT NULL,
  ativo INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all itens" ON public.checklist_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_itens_uat BEFORE UPDATE ON public.checklist_itens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VERIFICACOES ============
CREATE TABLE public.verificacoes (
  id BIGSERIAL PRIMARY KEY,
  obra_id BIGINT NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  avaliador TEXT NOT NULL,
  data_vistoria BIGINT NOT NULL,
  go TEXT,
  gc TEXT,
  nucleo TEXT,
  diretoria TEXT,
  score_geral INT,
  score_condicao INT,
  score_cronograma INT,
  score_qualidade INT,
  status_geral TEXT,
  status_condicao TEXT,
  status_cronograma TEXT,
  status_qualidade TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all verificacoes" ON public.verificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_verificacoes_uat BEFORE UPDATE ON public.verificacoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.verificacao_respostas (
  id BIGSERIAL PRIMARY KEY,
  verificacao_id BIGINT NOT NULL REFERENCES public.verificacoes(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES public.checklist_itens(id) ON DELETE CASCADE,
  resposta resposta_verificacao NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verificacao_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all respostas" ON public.verificacao_respostas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ CONFIG FAIXAS ============
CREATE TABLE public.config_faixas (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  minimo INT NOT NULL,
  maximo INT NOT NULL,
  cor TEXT NOT NULL,
  ordem INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.config_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read faixas" ON public.config_faixas FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write faixas" ON public.config_faixas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update faixas" ON public.config_faixas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete faixas" ON public.config_faixas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_faixas_uat BEFORE UPDATE ON public.config_faixas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ NOTIFICACOES ============
CREATE TABLE public.notificacoes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo tipo_notificacao NOT NULL DEFAULT 'geral',
  referencia_id BIGINT,
  referencia_tipo referencia_tipo,
  lida INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notif" ON public.notificacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notif" ON public.notificacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth insert notif" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('plantas', 'plantas', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias', 'evidencias', true) ON CONFLICT DO NOTHING;

CREATE POLICY "auth read plantas" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'plantas');
CREATE POLICY "auth upload plantas" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plantas');
CREATE POLICY "auth update plantas" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'plantas');
CREATE POLICY "auth delete plantas" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'plantas');

CREATE POLICY "auth read evid" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidencias');
CREATE POLICY "auth upload evid" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidencias');
CREATE POLICY "auth update evid" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'evidencias');
CREATE POLICY "auth delete evid" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'evidencias');