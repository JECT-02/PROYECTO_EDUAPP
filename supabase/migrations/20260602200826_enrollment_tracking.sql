-- Track AI interactions and study time for understanding level calculation
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS ai_interactions INT DEFAULT 0;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS study_time_sec INT DEFAULT 0;
