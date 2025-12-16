-- 1. Backfill missing worker_profiles for all users who don't have one
-- This ensures that when we try to update stats, the row exists.
insert into public.worker_profiles (user_id)
select id from public.users
where id not in (select user_id from public.worker_profiles);

-- 2. Update RPC to Upsert (Create profile if missing when incrementing job count)
create or replace function increment_completed_jobs(worker_uuid uuid)
returns void as $$
begin
  insert into public.worker_profiles (user_id, completed_jobs_count)
  values (worker_uuid, 1)
  on conflict (user_id) 
  do update set completed_jobs_count = worker_profiles.completed_jobs_count + 1;
end;
$$ language plpgsql security definer;

-- 3. Update Review Trigger Function to Upsert (Create profile if missing when adding a review)
create or replace function public.handle_new_review()
returns trigger as $$
begin
  insert into public.worker_profiles (user_id, reviews_count, average_rating)
  values (
    new.worker_id,
    (select count(*) from public.reviews where worker_id = new.worker_id),
    (select avg(rating) from public.reviews where worker_id = new.worker_id)
  )
  on conflict (user_id)
  do update set 
    reviews_count = excluded.reviews_count,
    average_rating = excluded.average_rating;
  return new;
end;
$$ language plpgsql security definer;
