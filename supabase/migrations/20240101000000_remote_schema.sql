-- Enable Extensions
create extension if not exists "uuid-ossp";

-- USERS (managed by Supabase Auth, but we use a public profile table)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'worker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  display_name text,
  avatar_url text,
  bio text,
  phone text,
  location text, -- simple text for now, or use PostGIS geography(POINT)
  role user_role default 'user',
  created_at timestamptz default now()
);

alter table public.users enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.users;
create policy "Public profiles are viewable by everyone." on public.users for select using (true);
drop policy if exists "Users can update own profile." on public.users;
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- CATEGORIES
create table if not exists public.categories (
  id serial primary key,
  slug text unique not null,
  title text not null,
  icon_name text,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;
drop policy if exists "Categories are viewable by everyone." on public.categories;
create policy "Categories are viewable by everyone." on public.categories for select using (true);

-- WORKER PROFILES
create table if not exists public.worker_profiles (
  id uuid default gen_random_uuid() primary key, -- distinct ID, or just use user_id
  user_id uuid references public.users(id) not null unique,
  title text,
  skills text[],
  hourly_rate_min numeric,
  hourly_rate_max numeric,
  portfolio_photos text[],
  gallery jsonb, -- [{url, caption}]
  reviews_count int default 0,
  average_rating numeric default 0,
  contact_links jsonb, -- {website, whatsapp, phone}
  completed_jobs_count int default 0,
  created_at timestamptz default now()
);

alter table public.worker_profiles enable row level security;
drop policy if exists "Worker profiles are viewable by everyone." on public.worker_profiles;
create policy "Worker profiles are viewable by everyone." on public.worker_profiles for select using (true);
drop policy if exists "Workers can update own profile." on public.worker_profiles;
create policy "Workers can update own profile." on public.worker_profiles for update using (auth.uid() = user_id);
drop policy if exists "Users can insert own worker profile." on public.worker_profiles;
create policy "Users can insert own worker profile." on public.worker_profiles for insert with check (auth.uid() = user_id);


-- TASKS
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
    CREATE TYPE task_type AS ENUM ('fixed', 'hourly', 'negotiable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  budget_min numeric,
  budget_max numeric,
  type task_type default 'fixed',
  location text,
  created_by uuid references public.users(id) not null,
  status task_status default 'open',
  photos text[],
  category_id int references public.categories(id),
  created_at timestamptz default now(),
  expires_at timestamptz,
  views int default 0
);

alter table public.tasks enable row level security;
drop policy if exists "Tasks are viewable by everyone." on public.tasks;
create policy "Tasks are viewable by everyone." on public.tasks for select using (true);
drop policy if exists "Users can insert their own tasks." on public.tasks;
create policy "Users can insert their own tasks." on public.tasks for insert with check (auth.uid() = created_by);
drop policy if exists "Users can update their own tasks." on public.tasks;
create policy "Users can update their own tasks." on public.tasks for update using (auth.uid() = created_by);

-- APPLICATIONS / OFFERS
DO $$ BEGIN
    CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

create table if not exists public.applications (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) not null,
  worker_id uuid references public.users(id) not null, -- linking to user_id who is a worker
  message text,
  offer_price numeric,
  status offer_status default 'pending',
  created_at timestamptz default now()
);

alter table public.applications enable row level security;
drop policy if exists "Task owners can view applications for their tasks." on public.applications;
create policy "Task owners can view applications for their tasks." on public.applications for select using ( exists (select 1 from public.tasks where id = task_id and created_by = auth.uid()) );
drop policy if exists "Workers can view their own applications." on public.applications;
create policy "Workers can view their own applications." on public.applications for select using (auth.uid() = worker_id);
drop policy if exists "Workers can create applications." on public.applications;
create policy "Workers can create applications." on public.applications for insert with check (auth.uid() = worker_id);


-- CONVERSATIONS & MESSAGES
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  participant_ids uuid[] not null,
  last_message text,
  last_message_at timestamptz default now(),
  unread_count_per_user jsonb, -- { "uuid": 5 }
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
drop policy if exists "Users can view conversations they are part of." on public.conversations;
create policy "Users can view conversations they are part of." on public.conversations for select using (auth.uid() = any(participant_ids));
drop policy if exists "Users can create conversations." on public.conversations;
create policy "Users can create conversations." on public.conversations for insert with check (auth.uid() = any(participant_ids));


create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.users(id) not null,
  body text,
  attachments text[],
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
drop policy if exists "Users can view messages in their conversations." on public.messages;
create policy "Users can view messages in their conversations." on public.messages for select using (
  exists (select 1 from public.conversations where id = conversation_id and auth.uid() = any(participant_ids))
);
drop policy if exists "Users can send messages to their conversations." on public.messages;
create policy "Users can send messages to their conversations." on public.messages for insert with check (auth.uid() = sender_id);


-- INDEXES
create index if not exists tasks_created_at_idx on public.tasks(created_at desc);
create index if not exists messages_conversation_id_created_at_idx on public.messages(conversation_id, created_at);
create index if not exists worker_profiles_user_id_idx on public.worker_profiles(user_id);

-- TRIGGER for user creation (Function to handle new user signup)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on recreation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
