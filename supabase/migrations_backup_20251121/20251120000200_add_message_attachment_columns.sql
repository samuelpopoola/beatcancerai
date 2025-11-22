-- Migration: add file_url, delivered_at, read_at to messages; attachments table; profile fields
-- Date: 2025-11-20

BEGIN;

-- 1) Add columns to existing messages table (safe with IF NOT EXISTS)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2) Create attachments table for richer attachment metadata (optional alternative to storing URL on messages)
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  chat_id text,
  uploader_id uuid,
  file_name text,
  content_type text,
  size bigint,
  url text,
  created_at timestamptz DEFAULT now()
);

-- 3) Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at ON public.messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON public.messages (delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages (read_at);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON public.attachments (message_id);

-- 4) Ensure profiles table has name/avatar fields used by the UI
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMIT;

-- NOTE: Row-Level Security (RLS) and policies are environment-specific. Example policies you may want to add
-- (adapt to your `chat_members`/acl schema and supabase `auth.uid()` usage):
--
-- -- Enable RLS on messages
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
--
-- -- Allow authenticated users to insert messages as themselves
-- CREATE POLICY "messages_insert_authenticated" ON public.messages
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated' AND sender_id = auth.uid());
--
-- -- Allow users to select messages if they are the sender or are a member of the chat (requires chat_members table)
-- CREATE POLICY "messages_select_members" ON public.messages
--   FOR SELECT
--   USING (
--     sender_id = auth.uid()
--     OR chat_id IN (SELECT chat_id FROM public.chat_members WHERE user_id = auth.uid())
--   );
--
-- Be sure to test migrations in a staging environment and backup your database before applying to production.
