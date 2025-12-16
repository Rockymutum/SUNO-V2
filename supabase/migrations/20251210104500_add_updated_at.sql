-- Add updated_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Optional: Create a trigger to automatically update this column on change
-- (For now, just adding the column is enough as the app updates it manually)
