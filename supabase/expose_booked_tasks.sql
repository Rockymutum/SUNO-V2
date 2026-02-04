-- Allow public access to view ALL tasks (including targeted/booked ones)
-- Previously, we restricted this so only creators/workers could see them.
-- Now, we want everyone to see them (Discovery Feed), but they can't apply to them if they aren't the target.

DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;

-- New Policy: Anyone can SELECT any task
CREATE POLICY "Anyone can view tasks" 
ON public.tasks FOR SELECT 
USING (true);

-- Ensure Insert/Update policies still restrict actions properly (this should already be handled by other policies, but good to double check safety)
-- We rely on existing policies for INSERT/UPDATE/DELETE which check auth.uid() = created_by
