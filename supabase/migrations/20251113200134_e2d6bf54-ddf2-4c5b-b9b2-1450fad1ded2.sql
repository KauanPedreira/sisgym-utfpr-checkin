-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('aluno', 'admin', 'funcionario');

-- Create enum for student status
CREATE TYPE public.student_status AS ENUM ('ativo', 'inativo', 'bloqueado');

-- Create enum for student type
CREATE TYPE public.student_type AS ENUM ('aluno', 'servidor', 'externo');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(11),
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create alunos table
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ra VARCHAR(8) UNIQUE,
  status student_status DEFAULT 'ativo',
  tipo_vinculo student_type NOT NULL,
  frequencia_esperada INTEGER DEFAULT 3,
  frequencia_total INTEGER DEFAULT 0,
  bloqueado_ate TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on alunos
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

-- Create qrcodes table
CREATE TABLE public.qrcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(100) UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  data_hora_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on qrcodes
ALTER TABLE public.qrcodes ENABLE ROW LEVEL SECURITY;

-- Create presencas table
CREATE TABLE public.presencas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qrcode_id UUID REFERENCES public.qrcodes(id) ON DELETE SET NULL,
  aluno_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on presencas
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

-- Create treinos table
CREATE TABLE public.treinos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  funcionario_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo VARCHAR(100) NOT NULL,
  objetivo VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on treinos
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;

-- Create exercicios table
CREATE TABLE public.exercicios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treino_id UUID REFERENCES public.treinos(id) ON DELETE CASCADE NOT NULL,
  nome_exercicio VARCHAR(100) NOT NULL,
  series INTEGER,
  repeticoes VARCHAR(50),
  descanso_segundos INTEGER,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on exercicios
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for alunos
CREATE POLICY "Students can view their own data"
  ON public.alunos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all students"
  ON public.alunos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update students"
  ON public.alunos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert students"
  ON public.alunos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for qrcodes
CREATE POLICY "Authenticated users can view active QR codes"
  ON public.qrcodes FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admins can manage QR codes"
  ON public.qrcodes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for presencas
CREATE POLICY "Students can view their own attendance"
  ON public.presencas FOR SELECT
  TO authenticated
  USING (auth.uid() = aluno_user_id);

CREATE POLICY "Admins can view all attendance"
  ON public.presencas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can insert their own attendance"
  ON public.presencas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = aluno_user_id);

CREATE POLICY "Admins can insert attendance"
  ON public.presencas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for treinos
CREATE POLICY "Students can view their own workouts"
  ON public.treinos FOR SELECT
  TO authenticated
  USING (auth.uid() = aluno_user_id);

CREATE POLICY "Admins can view all workouts"
  ON public.treinos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage workouts"
  ON public.treinos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for exercicios
CREATE POLICY "Users can view exercises from their workouts"
  ON public.exercicios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.treinos
      WHERE treinos.id = exercicios.treino_id
      AND treinos.aluno_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all exercises"
  ON public.exercicios FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage exercises"
  ON public.exercicios FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, cpf, nome, telefone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'telefone'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alunos_updated_at
  BEFORE UPDATE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treinos_updated_at
  BEFORE UPDATE ON public.treinos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();