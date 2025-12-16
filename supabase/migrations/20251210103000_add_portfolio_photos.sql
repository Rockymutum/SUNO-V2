-- Add missing columns for Worker Profile (EditWorkerProfile.jsx expects these in 'users' table)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS portfolio_photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT;
