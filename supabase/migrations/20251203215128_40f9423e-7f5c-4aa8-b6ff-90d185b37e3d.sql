-- Adicionar coluna vinculo à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vinculo VARCHAR(100);