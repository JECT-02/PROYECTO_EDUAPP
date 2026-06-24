-- Security definer function to check if a student already has an accepted parent
-- This bypasses RLS so any authenticated user can check before linking
create or replace function public.check_student_has_parent(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.parent_links
    where student_id = p_student_id and status = 'accepted'
  );
end;
$$;
