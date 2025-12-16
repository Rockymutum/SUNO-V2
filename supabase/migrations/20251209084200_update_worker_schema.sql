-- Enable the User to be a Worker
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
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0; -- Total number of reviews

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
