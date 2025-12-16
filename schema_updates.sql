-- Enable the User to be a Worker
-- This flag separates regular users from those who have opted-in to be workers
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_worker BOOLEAN DEFAULT FALSE;

-- Additional fields for Worker Profile details
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC,
ADD COLUMN IF NOT EXISTS skills TEXT[], -- Array of strings for skills
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0, -- Average rating
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0, -- Total number of reviews
ADD COLUMN IF NOT EXISTS portfolio_photos TEXT[] DEFAULT '{}', -- Array of image URLs for past work
ADD COLUMN IF NOT EXISTS category TEXT; -- Worker category (e.g. plumbing, electrical)

-- Safely create policy to allow users to update their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile"
        ON public.users FOR UPDATE
        USING ( auth.uid() = id );
    END IF;
END $$;
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
