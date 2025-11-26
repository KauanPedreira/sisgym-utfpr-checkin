-- Create aluno records for existing users that don't have one
-- This needs to be done in a migration to bypass RLS
INSERT INTO public.alunos (user_id, tipo_vinculo, frequencia_esperada, status)
SELECT 
  p.id,
  'aluno' as tipo_vinculo,
  3 as frequencia_esperada,
  'ativo' as status
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.alunos a WHERE a.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;