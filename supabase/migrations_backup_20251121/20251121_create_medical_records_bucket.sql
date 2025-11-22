-- Ensure the storage bucket used by the app exists in every environment.
-- Run with `supabase db push` or through your deployment pipeline.

insert into storage.buckets (id, name, public)
values ('medical-records', 'medical-records', true)
on conflict (id) do nothing;

-- Allow authenticated users to read any object in the medical-records bucket.
do $$
begin
  create policy "medical-records-select"
    on storage.objects for select
    using (bucket_id = 'medical-records' and auth.role() = 'authenticated');
exception when duplicate_object then
  null;
end $$;

-- Allow authenticated users to insert objects into the medical-records bucket.
do $$
begin
  create policy "medical-records-insert"
    on storage.objects for insert
    with check (bucket_id = 'medical-records' and auth.role() = 'authenticated');
exception when duplicate_object then
  null;
end $$;
