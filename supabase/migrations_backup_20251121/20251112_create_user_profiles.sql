-- Migration: create user_profiles table with common columns
-- Run in Supabase SQL editor or via your migration tool

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id text PRIMARY KEY,
  first_name text,
  last_name text,
  age integer,
  gender text,
  cancer_type text,
  cancer_stage text,
  diagnosis_date date,
  biomarkers text,
  treatment_goal text,
  oncologist text,
  primary_care text,
  family_contact text,
  completed_onboarding boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional: keep the "add names" migration, it's idempotent and safe to run after this.
