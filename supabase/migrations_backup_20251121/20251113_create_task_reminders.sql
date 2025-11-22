-- Create task_reminders table for scheduled reminders tied to care plan tasks
-- Idempotent: safe to run multiple times

CREATE TABLE IF NOT EXISTS task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES care_plan_tasks(id) ON DELETE CASCADE,
  reminder_time timestamptz NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and policies so users can only operate on reminders for their own tasks
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON task_reminders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      WHERE care_plan_tasks.id = task_reminders.task_id
        AND care_plan_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own reminders"
  ON task_reminders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      WHERE care_plan_tasks.id = task_reminders.task_id
        AND care_plan_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reminders"
  ON task_reminders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      WHERE care_plan_tasks.id = task_reminders.task_id
        AND care_plan_tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      WHERE care_plan_tasks.id = task_reminders.task_id
        AND care_plan_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reminders"
  ON task_reminders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM care_plan_tasks
      WHERE care_plan_tasks.id = task_reminders.task_id
        AND care_plan_tasks.user_id = auth.uid()
    )
  );

-- Indexes to make pending reminder queries fast
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_time ON task_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_task_reminders_sent ON task_reminders(sent);
