create table if not exists public.task_likes (
  user_id uuid references auth.users not null,
  task_id uuid references public.tasks not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, task_id)
);

alter table public.task_likes enable row level security;

create policy "Task likes are viewable by everyone"
  on public.task_likes for select
  using ( true );

create policy "Users can insert their own likes"
  on public.task_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own likes"
  on public.task_likes for delete
  using ( auth.uid() = user_id );
