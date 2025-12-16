-- Add updated_at column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
