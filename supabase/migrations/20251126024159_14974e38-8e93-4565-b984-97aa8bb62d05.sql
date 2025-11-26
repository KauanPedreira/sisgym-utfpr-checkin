-- Allow users to insert their own aluno record during signup
CREATE POLICY "Users can insert their own aluno record"
ON public.alunos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);