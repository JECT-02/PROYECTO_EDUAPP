-- supabase/migrations/20260602200822_align_schema.sql
-- Ajustes para alinear schema con código del frontend.

-- profiles: agregar dni (DNI) y campos de configuración
alter table public.profiles add column if not exists dni text;
alter table public.profiles add column if not exists dyslexia_font boolean default false;
alter table public.profiles add column if not exists colorblind_palette text;

-- courses: agregar level (int), invite_code, cover_color, y relajar status
alter table public.courses add column if not exists level int default 3 check (level between 1 and 5);
alter table public.courses add column if not exists invite_code text;
alter table public.courses add column if not exists cover_color text;
-- copiar invite_token -> invite_code si está vacío (para compatibilidad frontend)
update public.courses set invite_code = invite_token where invite_code is null;
create unique index if not exists courses_invite_code_idx on public.courses(invite_code) where invite_code is not null;

-- nodes: agregar quiz_data, abrir status para draft/archived
alter table public.nodes add column if not exists quiz_data jsonb;
alter table public.nodes drop constraint if exists nodes_status_check;
alter table public.nodes add constraint nodes_status_check
  check (status in ('pending_review','published','draft','archived'));

-- medals: agregar achievement, svg_data, color, description (sin romper schema actual)
alter table public.medals add column if not exists achievement text;
alter table public.medals add column if not exists svg_data text;
alter table public.medals add column if not exists color text;
alter table public.medals add column if not exists description text;
alter table public.medals add column if not exists created_at timestamptz default now();
-- backfill name -> achievement si achievement está vacío
update public.medals set achievement = name where achievement is null;

-- source_files: agregar campos esperados por el frontend
alter table public.source_files add column if not exists file_name text;
alter table public.source_files add column if not exists file_type text;
alter table public.source_files add column if not exists file_size bigint;
alter table public.source_files add column if not exists error text;
alter table public.source_files add column if not exists chunks_count int;

-- source_files: relajar status para processing/embedded/failed
alter table public.source_files drop constraint if exists source_files_status_check;
alter table public.source_files add constraint source_files_status_check
  check (status in ('pending','processing','embedded','failed','ready'));

-- progress: enrollment_id ya existe; no requiere backfill

-- weaknesses / error log para el análisis de errores del estudiante
create table if not exists public.weaknesses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  concept text not null,
  is_error boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists weaknesses_student_idx on public.weaknesses(student_id);
alter table public.weaknesses enable row level security;
drop policy if exists weaknesses_select_self on public.weaknesses;
create policy weaknesses_select_self on public.weaknesses
  for select to authenticated using (student_id = auth.uid());
drop policy if exists weaknesses_insert_self on public.weaknesses;
create policy weaknesses_insert_self on public.weaknesses
  for insert to authenticated with check (student_id = auth.uid());
drop policy if exists weaknesses_select_teacher on public.weaknesses;
create policy weaknesses_select_teacher on public.weaknesses
  for select to authenticated using (
    exists (select 1 from public.courses c where c.id = weaknesses.course_id and c.teacher_id = auth.uid())
  );
drop policy if exists weaknesses_select_parent on public.weaknesses;
create policy weaknesses_select_parent on public.weaknesses
  for select to authenticated using (
    exists (select 1 from public.parent_links pl where pl.student_id = weaknesses.student_id and pl.parent_id = auth.uid() and pl.status = 'accepted')
  );
