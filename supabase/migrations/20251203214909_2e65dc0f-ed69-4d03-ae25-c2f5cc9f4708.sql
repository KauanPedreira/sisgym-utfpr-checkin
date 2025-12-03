-- Adicionar colunas email e curso à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS curso VARCHAR(255);

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);