-- Migration: add reminder tracking columns to medications table
-- Adds reminder_enabled (boolean) and reminder_times (jsonb array of time strings)
-- Safe to run multiple times with IF NOT EXISTS guards.

ALTER TABLE IF EXISTS public.medications
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_times jsonb DEFAULT '[]'::jsonb;

-- Optional index to query active reminders quickly (if many medications)
CREATE INDEX IF NOT EXISTS idx_medications_reminder_enabled ON public.medications (reminder_enabled);

-- If you want to enforce valid time format (HH:MM) you could add a CHECK constraint:
-- ALTER TABLE public.medications ADD CONSTRAINT reminder_times_format CHECK (
--   jsonb_typeof(reminder_times) = 'array'
-- );

-- Note: Application layer responsible for converting HH:MM strings to actual scheduled timestamps.
