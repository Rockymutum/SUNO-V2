-- Grant explicit permissions to authenticated users
-- This ensures that authenticated users can access tables even with RLS enabled

-- Grant permissions on users table
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, UPDATE ON public.users TO anon;

-- Grant permissions on tasks table  
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT ON public.tasks TO anon;

-- Grant permissions on worker_profiles table
GRANT SELECT, INSERT, UPDATE ON public.worker_profiles TO authenticated;
GRANT SELECT ON public.worker_profiles TO anon;

-- Grant permissions on applications table
GRANT SELECT, INSERT ON public.applications TO authenticated;

-- Grant permissions on conversations table
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;

-- Grant permissions on messages table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;

-- Grant permissions on categories table
GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;

-- Grant usage on sequences if needed
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
