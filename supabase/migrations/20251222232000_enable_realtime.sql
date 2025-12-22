-- Enable Realtime for tables
-- This is often required for Supabase to broadcast changes to the client

BEGIN;

-- Check if publication exists, if not create it (standard Supabase setup usually has it)
-- We just ensure tables are added to the 'supabase_realtime' publication

-- 1. Add 'messages' table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2. Add 'conversations' table to realtime (for unread counts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- 3. Add 'notifications' table to realtime (for notification page)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMIT;
