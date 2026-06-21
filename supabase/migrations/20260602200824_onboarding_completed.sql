-- =============================================================================
-- 00024_onboarding_completed.sql — track onboarding state in profiles
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean not null default false;
