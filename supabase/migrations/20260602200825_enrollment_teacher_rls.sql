-- Permitir que docentes inscriban estudiantes en sus propios cursos
-- La policy existente enrollments_insert_student solo permite student_id = auth.uid()
-- Esta nueva policy permite que el docente (teacher_id del curso) inscriba a cualquiera

create policy enrollments_insert_teacher on public.enrollments
  for insert to authenticated
  with check (public.is_teacher_of(course_id));

-- También permitir que docentes eliminen estudiantes de sus cursos
create policy enrollments_delete_teacher on public.enrollments
  for delete to authenticated
  using (public.is_teacher_of(course_id));
