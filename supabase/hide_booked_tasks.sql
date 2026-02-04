-- Revert "Anyone can view tasks" policy
-- We want to hide "Direct Bookings" (where target_worker_id is NOT NULL) from the public.
-- They should ONLY be visible to:
-- 1. The Creator (Customer)
-- 2. The Target Worker
-- 3. Public (users) ONLY IF target_worker_id IS NULL (Open market jobs)

DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public tasks are visible" ON public.tasks; -- Drop old default if exists

-- Create the restrictive policy
CREATE POLICY "Visibility Policy"
ON public.tasks FOR SELECT
USING (
  -- 1. Public Open Jobs (Not booked for anyone specific)
  target_worker_id IS NULL
  OR
  -- 2. I am the Creator
  auth.uid() = created_by
  OR
  -- 3. I am the Target Worker
  auth.uid() = target_worker_id
);
