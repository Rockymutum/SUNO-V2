-- Allow everyone to see applications (transparency)
DROP POLICY IF EXISTS "Task owners can view applications for their tasks." ON public.applications;
DROP POLICY IF EXISTS "Workers can view their own applications." ON public.applications;
DROP POLICY IF EXISTS "Applications are viewable by everyone." ON public.applications;

CREATE POLICY "Applications are viewable by everyone." 
ON public.applications FOR SELECT 
USING ( true );

-- Ensure workers can still insert/update their own applications
-- (Existing policies might cover this, but good to be sure or leave them if they exist)
-- The remote schema had: "Workers can create applications." and "Workers can view their own applications."
-- We keep creation logic, just opening up VIEWING.
