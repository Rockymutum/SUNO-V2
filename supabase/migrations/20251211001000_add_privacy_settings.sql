-- Add privacy settings to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hide_phone BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN DEFAULT FALSE;
