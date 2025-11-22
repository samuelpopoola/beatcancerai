-- Supabase migration: create profiles, chats, membership, messages tables with RLS

-- profiles table links to auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  role text default 'patient', -- 'patient' | 'clinician'
  avatar_url text,
  created_at timestamptz default now()
);

-- chats table
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_by uuid references profiles(id),
  is_private boolean default true,
  created_at timestamptz default now()
);

-- membership table associates users with chats
create table if not exists chat_members (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'participant',
  created_at timestamptz default now(),
  unique (chat_id, user_id)
);

-- messages table
create table if not exists messages (
  id bigint generated always as identity primary key,
  chat_id uuid references chats(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text,
  meta jsonb default '{}'::jsonb,
  seen boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS and create policies
alter table chats enable row level security;
create policy "chats_select_if_member" on chats
  for select using (exists (select 1 from chat_members cm where cm.chat_id = chats.id and cm.user_id = auth.uid()));
create policy "chats_insert_allowed" on chats
  for insert with check (created_by = auth.uid());

alter table chat_members enable row level security;
create policy "members_select_if_member" on chat_members
  for select using (user_id = auth.uid());
create policy "members_insert_for_self" on chat_members
  for insert with check (user_id = auth.uid());

alter table messages enable row level security;
create policy "messages_select_if_member" on messages
  for select using (exists (select 1 from chat_members cm where cm.chat_id = messages.chat_id and cm.user_id = auth.uid()));
create policy "messages_insert_sender_is_auth" on messages
  for insert with check (sender_id = auth.uid());

-- Optionally allow clinicians to insert on behalf of patients via a service role - implement server-side checks instead of wide RLS exceptions.

