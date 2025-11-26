-- Enable realtime for alunos table
ALTER TABLE public.alunos REPLICA IDENTITY FULL;

-- Add alunos table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.alunos;