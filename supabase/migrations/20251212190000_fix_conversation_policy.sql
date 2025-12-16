-- Allow users to update conversations they are part of (e.g. updating last_message)
create policy "Users can update conversations they are part of"
on public.conversations
for update
using (
  auth.uid() = any(participant_ids)
);
