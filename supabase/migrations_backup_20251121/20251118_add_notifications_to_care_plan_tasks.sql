-- Add notifications and reminder columns to care_plan_tasks
ALTER TABLE IF EXISTS public.care_plan_tasks
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;

ALTER TABLE IF EXISTS public.care_plan_tasks
ADD COLUMN IF NOT EXISTS reminder text;
