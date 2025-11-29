-- Doctors catalog for video consultations
create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  experience_years integer,
  consultation_fee integer,
  rating numeric(3,2),
  avatar text,
  video_consultation boolean default true,
  created_at timestamptz default now()
);

alter table doctors enable row level security;
create policy "doctors_read_all" on doctors for select using (true);
create policy "doctors_service_write" on doctors
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
