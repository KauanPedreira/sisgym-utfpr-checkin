-- First, let's drop the constraint if it exists (in case it's in a broken state)
ALTER TABLE public.alunos
DROP CONSTRAINT IF EXISTS alunos_user_id_fkey;

-- Now create the foreign key relationship between alunos and profiles
ALTER TABLE public.alunos
ADD CONSTRAINT alunos_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles (id)
ON DELETE CASCADE;