-- Allow students to insert their own medals (for achievement system via checkAchievements)
create policy medals_insert_self on public.medals
  for insert to authenticated
  with check (student_id = auth.uid());
