-- Add last_seen to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();
