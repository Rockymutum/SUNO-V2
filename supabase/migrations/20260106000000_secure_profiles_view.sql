-- Migration: Secure Public Profiles View
-- 1. Enable RLS on users table if not already on
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Revoke public access to the raw users table
REVOKE SELECT ON public.users FROM anon, authenticated;

-- 3. STRICT RLS: Only owner can see their own row
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 4. Create the Secure View
-- This view effectively "bypasses" the table RLS because it is owned by a privileged role (postgres)
-- provided we grant access to it.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  avatar_url,
  bio,
  role,
  location,
  created_at,
  -- Conditional Phone Logic
  CASE
    WHEN hide_phone = true THEN NULL
    ELSE phone
  END as phone,
  
  -- Explicitly fetching other public fields if they exist in your schema, e.g. job_title
  raw_user_meta_data->>'job_title' as job_title,
  
  -- Flattening these for convenience if they are columns, adjust if they aren't
  -- assuming they are columns based on use in WorkerProfile.jsx
  -- If strict columns don't exist, remove them from here.
  -- Based on user description: id, display_name, phone, email, hide_phone
  -- The user prompt said: "expose id, display_name, avatar_url, bio, role, location, created_at"
  -- I will stick to the prompt's explicit list + phone.
  -- Wait, WorkerProfile uses: job_title, category, hourly_rate, skills, portfolio_photos.
  -- If these are columns in 'users', I must include them or WorkerProfile breaks.
  -- User context says: "Context: I have a public.users table with columns: id, display_name, phone, email, hide_phone...".
  -- But WorkerProfile.jsx is using: user.worker_profile (joined table) AND user.job_title etc.
  -- Actually, the code does: `worker_profile:worker_profiles(*)` which is a JOIN.
  -- The `users` table might have more columns than listed in the strict context.
  -- SAFE BET: Select * FROM users but exclude email/phone/hide_phone logic? No, Views don't support "SELECT * EXCEPT".
  -- I will select the columns explicitly asked for + those used in UI if they likely exist on users table.
  -- The prompt lists: "id, display_name, avatar_url, bio, role, location, created_at".
  
  -- Let's just mapping what the prompt asked for strictly, but be aware of broken UI.
  -- Prompt Requirement: "It should expose id, display_name, avatar_url, bio, role, location, created_at."
  -- Prompt Requirement: "Conditional Phone Logic"
  
  -- I will trust the prompt's list + phone.
  -- If extra columns are missing, I might break the UI.
  -- However, `worker_profile` is a separate table, so the join should still work if I join on the view?
  -- PostgREST allows joining tables/views if FK exists. The FK is on `worker_profiles.id` -> `users.id`.
  -- So I can join `public_profiles` -> `worker_profiles`.
  
  -- Let's build the view.
  -- Note: We need to set the owner to postgres to ensure bypass RLS works if we rely on that.
  NULL::text as dummy_col -- just to handle trailing commas easily
FROM public.users;

-- Re-doing the SELECT cleanly based on requirement
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  avatar_url,
  bio,
  role,
  location,
  created_at,
  CASE
    WHEN hide_phone = true THEN NULL
    ELSE phone
  END as phone
FROM public.users;

-- 5. Grant access to the View
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;
