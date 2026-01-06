-- Restore RLS policies that were corrupted or dropped
-- This migration re-enables RLS and recreates all necessary policies

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;

-- Recreate policies
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.users 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile." 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tasks are viewable by everyone." ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks." ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks." ON public.tasks;

-- Recreate policies
CREATE POLICY "Tasks are viewable by everyone." 
  ON public.tasks 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own tasks." 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tasks." 
  ON public.tasks 
  FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own tasks." 
  ON public.tasks 
  FOR DELETE 
  USING (auth.uid() = created_by);

-- ============================================================================
-- WORKER PROFILES TABLE (preventive)
-- ============================================================================

ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Worker profiles are viewable by everyone." ON public.worker_profiles;
DROP POLICY IF EXISTS "Workers can update own profile." ON public.worker_profiles;
DROP POLICY IF EXISTS "Users can insert own worker profile." ON public.worker_profiles;

CREATE POLICY "Worker profiles are viewable by everyone." 
  ON public.worker_profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Workers can update own profile." 
  ON public.worker_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own worker profile." 
  ON public.worker_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- APPLICATIONS TABLE (preventive)
-- ============================================================================

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task owners can view applications for their tasks." ON public.applications;
DROP POLICY IF EXISTS "Workers can view their own applications." ON public.applications;
DROP POLICY IF EXISTS "Workers can create applications." ON public.applications;

CREATE POLICY "Task owners can view applications for their tasks." 
  ON public.applications 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = task_id AND created_by = auth.uid()
  ));

CREATE POLICY "Workers can view their own applications." 
  ON public.applications 
  FOR SELECT 
  USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create applications." 
  ON public.applications 
  FOR INSERT 
  WITH CHECK (auth.uid() = worker_id);

-- ============================================================================
-- CONVERSATIONS TABLE (preventive)
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they are part of." ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations." ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they are part of." ON public.conversations;

CREATE POLICY "Users can view conversations they are part of." 
  ON public.conversations 
  FOR SELECT 
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversations." 
  ON public.conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update conversations they are part of." 
  ON public.conversations 
  FOR UPDATE 
  USING (auth.uid() = ANY(participant_ids));

-- ============================================================================
-- MESSAGES TABLE (preventive)
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations." ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations." ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages." ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages." ON public.messages;

CREATE POLICY "Users can view messages in their conversations." 
  ON public.messages 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id AND auth.uid() = ANY(participant_ids)
  ));

CREATE POLICY "Users can send messages to their conversations." 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages." 
  ON public.messages 
  FOR UPDATE 
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages." 
  ON public.messages 
  FOR DELETE 
  USING (auth.uid() = sender_id);

-- ============================================================================
-- CATEGORIES TABLE (preventive)
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;

CREATE POLICY "Categories are viewable by everyone." 
  ON public.categories 
  FOR SELECT 
  USING (true);
