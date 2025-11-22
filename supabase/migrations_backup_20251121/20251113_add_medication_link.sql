-- Migration: link medications to care_plan_tasks and add medication_tasks view
-- Run this in your Supabase SQL editor or via migrations tooling

-- 1) Add medication_id column to care_plan_tasks (idempotent)
ALTER TABLE IF EXISTS public.care_plan_tasks
  ADD COLUMN IF NOT EXISTS medication_id uuid;

-- 2) Add FK to medications.id only if medications table exists and FK not present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medications'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_care_plan_tasks_medications'
        AND table_schema = 'public'
        AND table_name = 'care_plan_tasks'
    ) THEN
      ALTER TABLE public.care_plan_tasks
        ADD CONSTRAINT fk_care_plan_tasks_medications
        FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 3) Create a view that surfaces active medications as upcoming medication tasks
--    Note: the `date` here is a placeholder (CURRENT_DATE). Replace with a calculated next-dose
--    expression if you have dosing schedule data available.
CREATE OR REPLACE VIEW public.medication_tasks AS
SELECT
  m.id AS id,
  m.user_id,
  m.name AS title,
  ('Take ' || m.name || ' - ' || coalesce(m.dosage, 'as prescribed')) AS description,
  'medication'::text AS category,
  'upcoming'::text AS status,
  CURRENT_DATE::date AS date,
  NULL::text AS time,
  NULL::text AS location
FROM public.medications m
WHERE m.active = true;

-- Optional: grant select on the view to authenticated role (Supabase may manage this via policies)
-- GRANT SELECT ON public.medication_tasks TO authenticated;

-- Indexing: not necessary for view, but keep an index on medications.user_id for performance
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications(user_id);

-- End migration
