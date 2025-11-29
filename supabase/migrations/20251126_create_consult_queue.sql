-- Consult queue for simple doctor matching
-- Tables: consult_queue (patient requests), clinician_status (availability)

create table if not exists clinician_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean default false,
  updated_at timestamptz default now()
);

alter table clinician_status enable row level security;
drop policy if exists "clinician_status_select_all" on clinician_status;
drop policy if exists "clinician_status_update_self" on clinician_status;
drop policy if exists "clinician_status_update_self2" on clinician_status;
drop policy if exists "clinician_status_insert_self" on clinician_status;
drop policy if exists "clinician_status_delete_self" on clinician_status;

create policy "clinician_status_select_all" on clinician_status
  for select
  using (true);

create policy "clinician_status_insert_self" on clinician_status
  for insert
  with check (auth.uid() = user_id);

create policy "clinician_status_update_self" on clinician_status
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clinician_status_update_self2" on clinician_status
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clinician_status_delete_self" on clinician_status
  for delete
  using (auth.uid() = user_id);

create table if not exists consult_queue (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting', -- waiting | assigned | completed | cancelled
  assigned_to uuid references auth.users(id),
  position int generated always as identity,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists consult_queue_status_idx on consult_queue(status);
create index if not exists consult_queue_created_idx on consult_queue(created_at);

alter table consult_queue enable row level security;
create policy "queue_patient_crud_own" on consult_queue
  for select using (patient_id = auth.uid());
create policy "queue_patient_insert" on consult_queue
  for insert with check (patient_id = auth.uid());
create policy "queue_patient_update_cancel" on consult_queue
  for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- Clinicians can view waiting items and assign themselves
create policy "queue_clinician_view" on consult_queue
  for select using (true);
create policy "queue_clinician_assign" on consult_queue
  for update using (true) with check (true);
