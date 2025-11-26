-- Create trigger to automatically increment attendance count when a new presence is registered
CREATE OR REPLACE FUNCTION increment_attendance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the frequencia_total for the student
  UPDATE alunos
  SET frequencia_total = frequencia_total + 1
  WHERE user_id = NEW.aluno_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_increment_attendance ON presencas;

-- Create trigger
CREATE TRIGGER trigger_increment_attendance
AFTER INSERT ON presencas
FOR EACH ROW
EXECUTE FUNCTION increment_attendance_on_insert();