-- Enable Extensions
create extension if not exists "uuid-ossp";

-- USERS (managed by Supabase Auth, but we use a public profile table)
create type user_role as enum ('user', 'worker');

create table public.users (
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
create policy "Public profiles are viewable by everyone." on public.users for select using (true);
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- CATEGORIES
create table public.categories (
  id serial primary key,
  slug text unique not null,
  title text not null,
  icon_name text,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;
create policy "Categories are viewable by everyone." on public.categories for select using (true);

-- WORKER PROFILES
create table public.worker_profiles (
  id uuid default uuid_generate_v4() primary key, -- distinct ID, or just use user_id
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
create policy "Worker profiles are viewable by everyone." on public.worker_profiles for select using (true);
create policy "Workers can update own profile." on public.worker_profiles for update using (auth.uid() = user_id);
create policy "Users can insert own worker profile." on public.worker_profiles for insert with check (auth.uid() = user_id);


-- TASKS
create type task_status as enum ('open', 'in_progress', 'completed', 'cancelled');
create type task_type as enum ('fixed', 'hourly', 'negotiable');

create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
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
create policy "Tasks are viewable by everyone." on public.tasks for select using (true);
create policy "Users can insert their own tasks." on public.tasks for insert with check (auth.uid() = created_by);
create policy "Users can update their own tasks." on public.tasks for update using (auth.uid() = created_by);

-- APPLICATIONS / OFFERS
create type offer_status as enum ('pending', 'accepted', 'rejected');

create table public.applications (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) not null,
  worker_id uuid references public.users(id) not null, -- linking to user_id who is a worker
  message text,
  offer_price numeric,
  status offer_status default 'pending',
  created_at timestamptz default now()
);

alter table public.applications enable row level security;
create policy "Task owners can view applications for their tasks." on public.applications for select using ( exists (select 1 from public.tasks where id = task_id and created_by = auth.uid()) );
create policy "Workers can view their own applications." on public.applications for select using (auth.uid() = worker_id);
create policy "Workers can create applications." on public.applications for insert with check (auth.uid() = worker_id);


-- CONVERSATIONS & MESSAGES
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_ids uuid[] not null,
  last_message text,
  last_message_at timestamptz default now(),
  unread_count_per_user jsonb, -- { "uuid": 5 }
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
create policy "Users can view conversations they are part of." on public.conversations for select using (auth.uid() = any(participant_ids));
create policy "Users can create conversations." on public.conversations for insert with check (auth.uid() = any(participant_ids));


create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.users(id) not null,
  body text,
  attachments text[],
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Users can view messages in their conversations." on public.messages for select using (
  exists (select 1 from public.conversations where id = conversation_id and auth.uid() = any(participant_ids))
);
create policy "Users can send messages to their conversations." on public.messages for insert with check (auth.uid() = sender_id);


-- INDEXES
create index tasks_created_at_idx on public.tasks(created_at desc);
create index messages_conversation_id_created_at_idx on public.messages(conversation_id, created_at);
create index worker_profiles_user_id_idx on public.worker_profiles(user_id);

-- TRIGGER for user creation (Function to handle new user signup)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
