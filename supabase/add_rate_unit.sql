
-- Add rate_unit column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS rate_unit text DEFAULT 'hour';

-- Optional: Add check constraint if needed, but text is flexible for now.
-- ALTER TABLE public.users ADD CONSTRAINT check_rate_unit CHECK (rate_unit IN ('hour', 'day'));
