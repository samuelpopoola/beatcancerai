-- Enable RLS
alter table chats enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;

-- CHAT POLICIES
create or replace policy "chats_select_if_member" on chats
  for select
  using (
    exists (
      select 1
      from chat_members cm
      where cm.chat_id = chats.id
      and cm.user_id = auth.uid()
    )
  );

create or replace policy "chats_insert_allowed" on chats
  for insert
  with check (created_by = auth.uid());

-- CHAT MEMBERS POLICIES
create or replace policy "members_select_if_member" on chat_members
  for select
  using (user_id = auth.uid());

create or replace policy "members_insert_for_self" on chat_members
  for insert
  with check (user_id = auth.uid());

-- MESSAGES POLICIES
create or replace policy "messages_select_if_member" on messages
  for select
  using (
    exists (
      select 1
      from chat_members cm
      where cm.chat_id = messages.chat_id
      and cm.user_id = auth.uid()
    )
  );

create or replace policy "messages_insert_sender_is_auth" on messages
  for insert
  with check (sender_id = auth.uid());
