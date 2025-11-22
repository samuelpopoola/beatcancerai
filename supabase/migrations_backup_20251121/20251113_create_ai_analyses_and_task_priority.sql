-- Create ai_analyses table to store AI-generated findings and recommendations
-- Also add a `priority` column to care_plan_tasks (idempotent)

CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid REFERENCES medical_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  findings jsonb,
  confidence_score double precision,
  recommendations jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add priority column to care_plan_tasks if it does not exist
ALTER TABLE care_plan_tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Enable RLS for ai_analyses
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own analyses"
    ON ai_analyses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own analyses"
    ON ai_analyses FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own analyses"
    ON ai_analyses FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own analyses"
    ON ai_analyses FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_id ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_medical_record_id ON ai_analyses(medical_record_id);
