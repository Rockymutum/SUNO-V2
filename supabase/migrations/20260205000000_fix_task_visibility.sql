-- Fix Task Visibility Policy for Targeted Workers
-- This migration ensures that tasks are visible to:
-- 1. The Creator
-- 2. The Target Worker (if specified)
-- 3. Everyone (if target_worker_id is NULL)

-- Enable RLS (just in case)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Tasks visibility policy" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public tasks are visible" ON public.tasks;
DROP POLICY IF EXISTS "Tasks are viewable by everyone." ON public.tasks;
DROP POLICY IF EXISTS "Visibility Policy" ON public.tasks;

-- Create the definitive policy
CREATE POLICY "Tasks Visibility Fixed"
ON public.tasks FOR SELECT
USING (
  -- 1. Public Open Jobs (Not booked for anyone specific)
  target_worker_id IS NULL
  OR
  -- 2. I am the Creator
  auth.uid() = created_by
  OR
  -- 3. I am the Target Worker
  auth.uid() = target_worker_id
);

-- Ensure Insert/Update/Delete policies are still there (re-validating)
-- Insert: only for own tasks
DROP POLICY IF EXISTS "Users can insert their own tasks." ON public.tasks;
CREATE POLICY "Users can insert their own tasks." 
ON public.tasks FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Update: only for own tasks
DROP POLICY IF EXISTS "Users can update their own tasks." ON public.tasks;
CREATE POLICY "Users can update their own tasks." 
ON public.tasks FOR UPDATE 
USING (auth.uid() = created_by);

-- Delete: only for own tasks
DROP POLICY IF EXISTS "Users can delete their own tasks." ON public.tasks;
CREATE POLICY "Users can delete their own tasks." 
ON public.tasks FOR DELETE 
USING (auth.uid() = created_by);
