-- Add category column to tasks table
alter table public.tasks 
add column if not exists category text;

-- Optional: Migrate existing category_id data to category text if needed, 
-- but since we are moving to text based, we can leave it empty for old records or backfill manually later.
-- This simple migration just adds the column to fix the frontend error.
