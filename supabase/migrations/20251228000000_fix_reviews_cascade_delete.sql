-- Fix cascade delete for reviews when tasks are deleted
-- This migration adds ON DELETE CASCADE to the reviews.task_id foreign key

-- Drop the existing foreign key constraint
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_task_id_fkey;

-- Re-add the foreign key with CASCADE delete
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;
