-- Create table for storing in-app notification history
create table if not exists public.notifications (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    title text not null,
    body text not null,
    data jsonb, -- Stores metadata like URL: { "url": "/tasks/123" }
    is_read boolean default false,
    created_at timestamptz default now()
);

-- RLS
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
on public.notifications for select
using (auth.uid() = user_id);

create policy "Users can update their own notifications" -- Mark as read
on public.notifications for update
using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
on public.notifications for delete
using (auth.uid() = user_id);

-- System (Edge Function) needs to insert, so ensure service_role has access (default true)
grant all on public.notifications to service_role;
grant all on public.notifications to authenticated;
