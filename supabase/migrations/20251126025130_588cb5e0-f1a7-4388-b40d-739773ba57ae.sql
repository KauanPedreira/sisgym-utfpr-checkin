-- Update frequencia_total for all students based on existing attendance records
UPDATE alunos
SET frequencia_total = (
  SELECT COUNT(*)
  FROM presencas
  WHERE presencas.aluno_user_id = alunos.user_id
);