-- Create Reviews Table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) not null,
  reviewer_id uuid references public.users(id) not null,
  worker_id uuid references public.users(id) not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamptz default now()
);

-- RLS
alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone" 
  on public.reviews for select 
  using (true);

create policy "Users can modify their own reviews" 
  on public.reviews for insert 
  with check (auth.uid() = reviewer_id);

-- Function to Recalculate Worker Rating
create or replace function public.handle_new_review()
returns trigger as $$
begin
  update public.worker_profiles
  set 
    reviews_count = (select count(*) from public.reviews where worker_id = new.worker_id),
    average_rating = (select avg(rating) from public.reviews where worker_id = new.worker_id)
  where user_id = new.worker_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute procedure public.handle_new_review();
