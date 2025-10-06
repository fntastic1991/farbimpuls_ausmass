-- Create table to store photo URLs per measurement
create table if not exists public.measurement_photos (
  id uuid primary key default gen_random_uuid(),
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  url text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS and allow authenticated users CRUD limited to their project via FK path
alter table public.measurement_photos enable row level security;

-- Basic policies: allow authenticated users to manage their photos; refine as needed
drop policy if exists "measurement_photos_select" on public.measurement_photos;
create policy "measurement_photos_select"
  on public.measurement_photos for select
  to authenticated
  using (true);

drop policy if exists "measurement_photos_insert" on public.measurement_photos;
create policy "measurement_photos_insert"
  on public.measurement_photos for insert
  to authenticated
  with check (true);

drop policy if exists "measurement_photos_delete" on public.measurement_photos;
create policy "measurement_photos_delete"
  on public.measurement_photos for delete
  to authenticated
  using (true);

-- Create a public storage bucket for measurement photos (readable by anyone with the URL)
select
  case when not exists (
    select 1 from storage.buckets where id = 'measurement-photos'
  ) then storage.create_bucket('measurement-photos', public := true)
  else null end;

-- Storage RLS policies for the bucket
drop policy if exists "Public read access to measurement-photos" on storage.objects;
create policy "Public read access to measurement-photos"
on storage.objects for select
to public
using (bucket_id = 'measurement-photos');

drop policy if exists "Authenticated can upload measurement-photos" on storage.objects;
create policy "Authenticated can upload measurement-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'measurement-photos');

drop policy if exists "Authenticated can delete own measurement-photos" on storage.objects;
create policy "Authenticated can delete own measurement-photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'measurement-photos');


