-- Allow authenticated users to insert notifications for ANYONE (needed for chat, tasks, etc.)
-- This fixes the 403 Forbidden error when trying to notify other users.

-- First, drop potential conflicting policies to ensure clean state
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.notifications;
DROP POLICY IF EXISTS "System/Anyone can create notifications" ON public.notifications;

-- Create the permissive insert policy
CREATE POLICY "Users can create notifications for others"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure Select policy is strictly for the recipient (privacy)
-- (This shouldn't change, but good to reinforce)
-- DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
-- CREATE POLICY "Users can view their own notifications"
-- ON public.notifications FOR SELECT
-- USING (auth.uid() = user_id);
