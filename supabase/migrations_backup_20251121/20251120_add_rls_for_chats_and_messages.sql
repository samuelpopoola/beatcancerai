-- Migration: Add Row-Level Security policies for chats and messages
-- Date: 2025-11-20

-- IMPORTANT: Review and adapt these policies to your schema and business rules before applying in production.
-- These policies are a developer-friendly baseline to allow authenticated users to create chats and send messages
-- where they are the actor. Tighten conditions (chat membership checks, clinician roles, private buckets) for production.

-- Defensive: Ensure chats table has a created_by column that we can use in policies.
-- If your schema uses a different owner column, update this migration to match it.
ALTER TABLE IF EXISTS public.chats ADD COLUMN IF NOT EXISTS created_by uuid;
-- Backfill created_by from patient_id where possible to avoid NULLs for legacy rows
UPDATE public.chats SET created_by = patient_id WHERE created_by IS NULL AND patient_id IS NOT NULL;

-- Enable RLS on chats table
ALTER TABLE IF EXISTS public.chats ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert chats only when they are the creator (created_by = auth.uid())
DROP POLICY IF EXISTS "Allow authenticated insert chats" ON public.chats;
CREATE POLICY "Allow authenticated insert chats" ON public.chats
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to select chats when they are the patient or the creator
DROP POLICY IF EXISTS "Allow authenticated select chats" ON public.chats;
CREATE POLICY "Allow authenticated select chats" ON public.chats
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid() OR created_by = auth.uid());

-- Allow authenticated users to update chats they created (narrow this as needed)
DROP POLICY IF EXISTS "Allow authenticated update chats" ON public.chats;
CREATE POLICY "Allow authenticated update chats" ON public.chats
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Defensive: ensure messages.chat_id exists (index will fail if column missing)
-- Proceeding assumes messages table exists and has chat_id

-- Enable RLS on messages table
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert messages where sender_id = auth.uid()
DROP POLICY IF EXISTS "Allow insert messages for sender" ON public.messages;
CREATE POLICY "Allow insert messages for sender" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Allow authenticated users to select messages that belong to chats they participate in.
-- This example uses the chats table to determine participation: patient_id or created_by match auth.uid().
DROP POLICY IF EXISTS "Allow select messages for chat participants" ON public.messages;
CREATE POLICY "Allow select messages for chat participants" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c WHERE c.id = public.messages.chat_id
        AND (c.patient_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Allow updates to message delivery/read timestamps by participants (e.g., marking delivered/read)
DROP POLICY IF EXISTS "Allow update messages for participants" ON public.messages;
CREATE POLICY "Allow update messages for participants" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    -- allow update if user is the sender OR a chat participant
    sender_id = auth.uid() OR (
      EXISTS (
        SELECT 1 FROM public.chats c WHERE c.id = public.messages.chat_id
          AND (c.patient_id = auth.uid() OR c.created_by = auth.uid())
      )
    )
  )
  WITH CHECK (true);

-- Optional indexes to speed lookups
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_patient_id ON public.chats (patient_id);

-- Notes:
-- 1) If your schema uses a chat_members or participants table, replace the EXISTS checks above with a membership lookup
--    e.g., EXISTS (SELECT 1 FROM public.chat_members m WHERE m.chat_id = public.messages.chat_id AND m.user_id = auth.uid())
-- 2) Review permissions for 'profiles' and 'attachments' tables/buckets and add RLS policies there as well to control access to avatars/attachments.
-- 3) To apply this migration: run using psql / Supabase SQL editor or your migration tooling.
-- 4) Always test these policies with real users in a staging environment before deploying to production.
