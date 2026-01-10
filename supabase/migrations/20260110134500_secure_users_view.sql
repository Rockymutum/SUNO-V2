-- Migration: 20260110134500_secure_users_view.sql

-- 1. Create Safe View
-- Drop first to allow structural changes (column additions/reordering)
DROP VIEW IF EXISTS public.public_user_details CASCADE;

CREATE OR REPLACE VIEW public.public_user_details AS
SELECT 
    id,
    display_name,
    avatar_url,
    bio,
    role,
    location,
    is_worker,
    category,
    job_title,
    skills,
    hourly_rate,
    vacation_mode,
    last_seen,
    created_at
FROM 
    public.users;

-- Grant access to the view
GRANT SELECT ON public.public_user_details TO authenticated, anon;

-- 2. Secure public.users Table
-- Enable RLS (should be already enabled, but ensure it)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop insecure policies (blindly dropping common names or all to be safe?)
-- We'll try to drop likely existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
-- Also drop any 'Authenticated' policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.users;

-- Create STRICT policies
-- A. SELECT: Only own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- B. INSERT: Own profile (for auto-heal)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- C. UPDATE: Own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- 3. Optional: Contact Info Function
-- Returns email/phone ONLY if the requester has an ACCEPTED application with the target.
CREATE OR REPLACE FUNCTION public.get_worker_contact_info(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contact_info JSONB;
BEGIN
    -- Logic: Check if there is an 'accepted' application linking the current user (auth.uid()) and the target_user_id
    -- The link exists if:
    -- 1. I am the Task Owner (Client) and Target is the Worker.
    -- 2. I am the Worker and Target is the Task Owner (Client).
    
    SELECT jsonb_build_object('email', u.email, 'phone', u.phone)
    INTO v_contact_info
    FROM public.users u
    WHERE u.id = target_user_id
    AND EXISTS (
        SELECT 1 
        FROM public.applications a
        JOIN public.tasks t ON t.id = a.task_id
        WHERE a.status = 'accepted'
        AND (
            (a.worker_id = auth.uid() AND t.created_by = target_user_id) -- I am worker, viewing client
            OR
            (t.created_by = auth.uid() AND a.worker_id = target_user_id) -- I am client, viewing worker
        )
    );

    IF v_contact_info IS NULL THEN
        -- Return generic structure with nulls if no access
        RETURN jsonb_build_object('email', null, 'phone', null, 'access', false);
    ELSE
        -- Add access flag
        RETURN v_contact_info || jsonb_build_object('access', true);
    END IF;
END;
$$;
