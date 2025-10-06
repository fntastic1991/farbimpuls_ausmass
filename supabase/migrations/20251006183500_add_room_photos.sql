create table if not exists public.room_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  url text not null,
  created_at timestamp with time zone default now()
);

alter table public.room_photos enable row level security;

create policy if not exists "room_photos_select"
  on public.room_photos for select to authenticated using (true);
create policy if not exists "room_photos_insert"
  on public.room_photos for insert to authenticated with check (true);
create policy if not exists "room_photos_delete"
  on public.room_photos for delete to authenticated using (true);

-- storage bucket for room photos
select case when not exists (select 1 from storage.buckets where id='room-photos')
  then storage.create_bucket('room-photos', public := true) else null end;

create policy if not exists "Public read room-photos" on storage.objects for select to public using (bucket_id='room-photos');
create policy if not exists "Auth write room-photos" on storage.objects for insert to authenticated with check (bucket_id='room-photos');
create policy if not exists "Auth delete room-photos" on storage.objects for delete to authenticated using (bucket_id='room-photos');


