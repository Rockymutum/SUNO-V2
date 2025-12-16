-- Allow task owners to update applications (e.g., to set status to 'accepted')
create policy "Task owners can update applications for their tasks"
on public.applications
for update
using (
  auth.uid() in (
    select created_by from public.tasks where id = applications.task_id
  )
)
with check (
  auth.uid() in (
    select created_by from public.tasks where id = applications.task_id
  )
);
