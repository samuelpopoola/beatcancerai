-- Migration: enable RLS and add policies for user_profiles
-- Run this in the Supabase SQL editor or include in your migration pipeline.

-- Enable row level security
ALTER TABLE IF EXISTS public.user_profiles
  ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to INSERT their own profile (id must equal auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'allow_authenticated_insert_own_profile'
  ) THEN
    CREATE POLICY allow_authenticated_insert_own_profile
      ON public.user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- Policy: allow authenticated users to SELECT their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'allow_authenticated_select_own_profile'
  ) THEN
    CREATE POLICY allow_authenticated_select_own_profile
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END$$;

-- Policy: allow authenticated users to UPDATE their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'allow_authenticated_update_own_profile'
  ) THEN
    CREATE POLICY allow_authenticated_update_own_profile
      ON public.user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- Policy: optionally allow authenticated users to DELETE their own profile (uncomment if desired)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'allow_authenticated_delete_own_profile'
--   ) THEN
--     CREATE POLICY allow_authenticated_delete_own_profile
--       ON public.user_profiles
--       FOR DELETE
--       TO authenticated
--       USING (auth.uid() = id);
--   END IF;
-- END$$;
