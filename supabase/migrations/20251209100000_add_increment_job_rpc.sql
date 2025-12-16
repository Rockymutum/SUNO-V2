-- RPC to increment completed_jobs_count
-- This allows a Task Owner to update a Worker's profile stats without giving them full update access
create or replace function increment_completed_jobs(worker_uuid uuid)
returns void as $$
begin
  update public.worker_profiles
  set completed_jobs_count = completed_jobs_count + 1
  where user_id = worker_uuid;
end;
$$ language plpgsql security definer;
