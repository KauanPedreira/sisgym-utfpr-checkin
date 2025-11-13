-- Create function to increment student attendance
CREATE OR REPLACE FUNCTION increment_attendance(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE alunos
  SET frequencia_total = frequencia_total + 1
  WHERE alunos.user_id = increment_attendance.user_id;
END;
$$;