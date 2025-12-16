-- Create a table to store Push Subscriptions
-- Each user can have multiple subscriptions (multiple devices), so we key by user_id AND endpoint (or just id)
-- However, for simplicity, let's just store specific subscriptions linked to a user.

create table if not exists public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    endpoint text not null,
    p256dh text not null,
    auth text not null,
    user_agent text, -- Optional: to identify device
    created_at timestamptz default now(),
    last_used_at timestamptz default now(),
    
    -- Ensure unique endpoint per user to avoid duplicates
    unique(user_id, endpoint)
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
create policy "Users can insert their own subscriptions"
on public.push_subscriptions for insert
with check (auth.uid() = user_id);

create policy "Users can view their own subscriptions"
on public.push_subscriptions for select
using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
on public.push_subscriptions for delete
using (auth.uid() = user_id);

-- Grants
grant all on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
