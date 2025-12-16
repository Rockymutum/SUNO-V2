-- Allow users to insert their own profile row (backup if trigger fails)
drop policy if exists "Users can insert own profile." on public.users;
create policy "Users can insert own profile." on public.users for insert with check (auth.uid() = id);
