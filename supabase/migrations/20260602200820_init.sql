-- =============================================================================
-- 0001_init.sql — base tables, RLS, triggers, storage buckets
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector    with schema extensions;

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (extends auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','teacher','parent','admin')),
  full_name text,
  email text,
  age_band text check (age_band in ('7-10','11-14','15-17','18+')),
  institution text,
  subject text,
  relation text,
  avatar_id int,
  pet_type text check (pet_type in ('dragon','robot','owl')),
  pet_name text,
  pet_xp int not null default 0,
  accessibility_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  level text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  rigor int not null default 3 check (rigor between 1 and 5),
  invite_token text unique default encode(extensions.gen_random_bytes(6),'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_teacher_idx on public.courses(teacher_id);
create index if not exists courses_status_idx on public.courses(status);
create index if not exists courses_invite_token_idx on public.courses(invite_token);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- nodes (roadmap)
-- -----------------------------------------------------------------------------
create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position int not null,
  type text not null check (type in ('theory','practice','quiz','boss','reward')),
  title text not null,
  description text,
  content text,
  status text not null default 'pending_review' check (status in ('pending_review','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create index if not exists nodes_course_idx on public.nodes(course_id);

create trigger nodes_set_updated_at
before update on public.nodes
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- enrollments
-- -----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists enrollments_student_idx on public.enrollments(student_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);

-- -----------------------------------------------------------------------------
-- progress
-- -----------------------------------------------------------------------------
create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  state text not null default 'locked' check (state in ('locked','available','in_progress','completed')),
  score numeric,
  attempts int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, node_id)
);

create index if not exists progress_enrollment_idx on public.progress(enrollment_id);

create trigger progress_set_updated_at
before update on public.progress
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- source_files (material uploaded by teachers)
-- -----------------------------------------------------------------------------
create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  filename text,
  storage_path text,
  file_type text check (file_type in ('pdf','docx','txt','youtube')),
  status text not null default 'pending' check (status in ('pending','extracting','embedding','ready','error')),
  chunks_count int,
  created_at timestamptz not null default now()
);

create index if not exists source_files_course_idx on public.source_files(course_id);

-- -----------------------------------------------------------------------------
-- weaknesses (per-student, per-concept error tracking)
-- -----------------------------------------------------------------------------
create table if not exists public.weaknesses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  concept text not null,
  confusion_level int not null default 0,
  total_errors int not null default 0,
  last_seen timestamptz,
  unique (student_id, course_id, concept)
);

create index if not exists weaknesses_student_course_idx on public.weaknesses(student_id, course_id);

-- -----------------------------------------------------------------------------
-- medals
-- -----------------------------------------------------------------------------
create table if not exists public.medals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  medal_type text check (medal_type in ('mastery','behavior','secret')),
  name text,
  rarity text check (rarity in ('common','rare','epic','legendary')),
  svg_url text,
  unlocked_at timestamptz not null default now()
);

create index if not exists medals_student_idx on public.medals(student_id);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text check (type in ('parent_request','alert','medal','message')),
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, read);

-- -----------------------------------------------------------------------------
-- parent_links
-- -----------------------------------------------------------------------------
create table if not exists public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

create index if not exists parent_links_parent_idx on public.parent_links(parent_id);
create index if not exists parent_links_student_idx on public.parent_links(student_id);

-- -----------------------------------------------------------------------------
-- auto-create profile on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role','student'),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- helper: get role of current user
-- -----------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_teacher_of(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.courses
    where id = p_course_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_linked_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.parent_links
    where parent_id = auth.uid()
      and student_id = p_student_id
      and status = 'accepted'
  );
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.courses             enable row level security;
alter table public.nodes               enable row level security;
alter table public.enrollments         enable row level security;
alter table public.progress            enable row level security;
alter table public.source_files        enable row level security;
alter table public.weaknesses          enable row level security;
alter table public.medals              enable row level security;
alter table public.notifications       enable row level security;
alter table public.parent_links        enable row level security;

-- profiles: read all authenticated; update only own
create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- courses: everyone reads published; teacher full access on own
create policy courses_select on public.courses
  for select to authenticated using (
    status = 'published' or teacher_id = auth.uid() or public.is_teacher_of(id)
  );

create policy courses_insert_teacher on public.courses
  for insert to authenticated with check (teacher_id = auth.uid() and public.current_role() = 'teacher');

create policy courses_update_teacher on public.courses
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy courses_delete_teacher on public.courses
  for delete to authenticated using (teacher_id = auth.uid());

-- nodes: read published (or own course); teacher manages own course
create policy nodes_select on public.nodes
  for select to authenticated using (
    status = 'published' or public.is_teacher_of(course_id)
  );

create policy nodes_modify_teacher on public.nodes
  for all to authenticated
  using (public.is_teacher_of(course_id))
  with check (public.is_teacher_of(course_id));

-- enrollments: student own; teacher of course; linked parent
create policy enrollments_select on public.enrollments
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_teacher_of(course_id)
    or public.is_linked_parent_of(student_id)
  );

create policy enrollments_insert_student on public.enrollments
  for insert to authenticated with check (student_id = auth.uid());

create policy enrollments_delete_student on public.enrollments
  for delete to authenticated using (student_id = auth.uid());

-- progress: student own (via enrollment); teacher of course; linked parent
create policy progress_select on public.progress
  for select to authenticated using (
    enrollment_id in (select id from public.enrollments where student_id = auth.uid())
    or enrollment_id in (
      select e.id from public.enrollments e where public.is_teacher_of(e.course_id)
    )
    or enrollment_id in (
      select e.id from public.enrollments e
      join public.parent_links pl on pl.student_id = e.student_id
      where pl.parent_id = auth.uid() and pl.status = 'accepted'
    )
  );

create policy progress_modify_self on public.progress
  for all to authenticated
  using (
    enrollment_id in (select id from public.enrollments where student_id = auth.uid())
  )
  with check (
    enrollment_id in (select id from public.enrollments where student_id = auth.uid())
  );

create policy progress_modify_teacher on public.progress
  for all to authenticated
  using (
    enrollment_id in (
      select e.id from public.enrollments e where public.is_teacher_of(e.course_id)
    )
  )
  with check (
    enrollment_id in (
      select e.id from public.enrollments e where public.is_teacher_of(e.course_id)
    )
  );

-- source_files: only teacher of the course
create policy source_files_teacher_all on public.source_files
  for all to authenticated
  using (public.is_teacher_of(course_id))
  with check (public.is_teacher_of(course_id));

-- weaknesses: student own; teacher of course; linked parent
create policy weaknesses_select on public.weaknesses
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_teacher_of(course_id)
    or public.is_linked_parent_of(student_id)
  );

create policy weaknesses_modify_self on public.weaknesses
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy weaknesses_modify_teacher on public.weaknesses
  for all to authenticated
  using (public.is_teacher_of(course_id))
  with check (public.is_teacher_of(course_id));

-- medals: student own; teacher of any course the student has; linked parent
create policy medals_select on public.medals
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_linked_parent_of(student_id)
    or exists (
      select 1 from public.enrollments e
      where e.student_id = medals.student_id
        and public.is_teacher_of(e.course_id)
    )
  );

create policy medals_insert_teacher on public.medals
  for insert to authenticated with check (
    exists (
      select 1 from public.enrollments e
      where e.student_id = student_id and public.is_teacher_of(e.course_id)
    )
  );

-- notifications: own user only
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_self on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- parent_links: parent sees own; student sees requests addressed to them
create policy parent_links_select on public.parent_links
  for select to authenticated using (
    parent_id = auth.uid() or student_id = auth.uid()
  );

create policy parent_links_insert_parent on public.parent_links
  for insert to authenticated with check (parent_id = auth.uid());

create policy parent_links_update_student on public.parent_links
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy parent_links_delete_parent on public.parent_links
  for delete to authenticated using (parent_id = auth.uid());

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('medals', 'medals', true),
  ('course-source', 'course-source', false)
on conflict (id) do nothing;

-- avatars: public read, owner write/update
create policy "avatars read" on storage.objects
  for select to public using (bucket_id = 'avatars');

create policy "avatars write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- medals: public read
create policy "medals read" on storage.objects
  for select to public using (bucket_id = 'medals');

create policy "medals write" on storage.objects
  for insert to authenticated with check (bucket_id = 'medals');

-- course-source: only the teacher of the course can read/write
create policy "course-source read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-source'
    and exists (
      select 1 from public.source_files sf
      where sf.storage_path = name
        and public.is_teacher_of(sf.course_id)
    )
  );

create policy "course-source write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-source'
    and exists (
      select 1 from public.source_files sf
      where sf.storage_path = name
        and public.is_teacher_of(sf.course_id)
    )
  );
