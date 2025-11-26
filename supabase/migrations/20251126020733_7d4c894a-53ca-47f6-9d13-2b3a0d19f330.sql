-- Enable realtime for presencas table
ALTER TABLE public.presencas REPLICA IDENTITY FULL;

-- Add presencas table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.presencas;