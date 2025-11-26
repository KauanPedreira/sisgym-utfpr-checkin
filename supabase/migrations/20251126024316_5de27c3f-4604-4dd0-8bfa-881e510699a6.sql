-- Drop any existing foreign key constraints on user_id
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'alunos_user_id_fkey' 
    AND table_name = 'alunos'
  ) THEN
    ALTER TABLE public.alunos DROP CONSTRAINT alunos_user_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.alunos
ADD CONSTRAINT alunos_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles (id)
ON DELETE CASCADE;

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';