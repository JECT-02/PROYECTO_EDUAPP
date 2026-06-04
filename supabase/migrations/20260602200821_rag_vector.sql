-- =============================================================================
-- 0002_rag_vector.sql — documents table, embeddings, semantic search
-- =============================================================================

set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- documents (chunks of source material with embeddings)
-- gemini-embedding-001 → 768 dim
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  source_id uuid not null references public.source_files(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documents_course_idx on public.documents(course_id);
create index if not exists documents_source_idx on public.documents(source_id);

-- HNSW index for cosine similarity (no training needed, works on empty table)
create index if not exists documents_embedding_hnsw
  on public.documents
  using hnsw (embedding vector_cosine_ops);

-- -----------------------------------------------------------------------------
-- match_documents: semantic search by course
-- -----------------------------------------------------------------------------
create or replace function public.match_documents(
  query_embedding vector(768),
  match_course_id uuid,
  match_count int default 5,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.course_id = match_course_id
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- -----------------------------------------------------------------------------
-- RLS for documents
-- -----------------------------------------------------------------------------
alter table public.documents enable row level security;

create policy documents_select_teacher on public.documents
  for select to authenticated
  using (public.is_teacher_of(course_id));

create policy documents_select_student on public.documents
  for select to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      where e.course_id = documents.course_id
        and e.student_id = auth.uid()
    )
  );

create policy documents_modify_teacher on public.documents
  for all to authenticated
  using (public.is_teacher_of(course_id))
  with check (public.is_teacher_of(course_id));

-- -----------------------------------------------------------------------------
-- realtime: notify progress + notifications + medals + source_files status
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.progress;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.medals;
alter publication supabase_realtime add table public.source_files;
