-- Enforce one parent per student: a student can only have one accepted parent link
-- This is a partial unique index — only applies to accepted links
create unique index if not exists parent_links_one_parent_per_student
  on public.parent_links (student_id)
  where status = 'accepted';
