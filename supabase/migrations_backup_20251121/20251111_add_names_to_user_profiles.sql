-- Migration: add first_name and last_name to user_profiles
-- Run with supabase migration system or directly in Postgres.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS first_name text;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS last_name text;

-- Optional: set default values for existing rows (empty string)
UPDATE public.user_profiles
SET first_name = first_name
WHERE first_name IS NULL;

UPDATE public.user_profiles
SET last_name = last_name
WHERE last_name IS NULL;
