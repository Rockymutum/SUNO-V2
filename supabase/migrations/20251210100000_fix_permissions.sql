-- FIX: Ensure Storage Bucket Exists and Policies are Open

-- 1. Create 'task_photos' bucket if not exists
insert into storage.buckets (id, name, public)
values ('task_photos', 'task_photos', true)
on conflict (id) do nothing;

-- 2. Storage Policies (Allow Authenticated Users to Upload/View)
-- View
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'task_photos' );

-- Upload (Insert)
create policy "Authenticated Users Can Upload"
  on storage.objects for insert
  with check ( bucket_id = 'task_photos' and auth.role() = 'authenticated' );

-- Update/Delete (Optional, but good for removing own photos)
create policy "Users Can Update Own Photos"
  on storage.objects for update
  using ( bucket_id = 'task_photos' and auth.uid() = owner );

create policy "Users Can Delete Own Photos"
  on storage.objects for delete
  using ( bucket_id = 'task_photos' and auth.uid() = owner );


-- FIX: Ensure Users can Update their own profile in 'users' table
-- We drop and recreate to be sure
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using ( auth.uid() = id );

-- Grant usage just in case
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
