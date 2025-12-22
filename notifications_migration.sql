-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB, -- For metadata like URL redirection
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications." 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark read)." 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System/Anyone can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true); 
-- Note: In strict RLS, you might want to limit INSERT to serverside only or triggered by logic.
-- But for Client-side 'sendMessage' creating a notification for 'otherUser', 
-- we need to allow authenticated users to INSERT notifications for OTHERS?
-- Actually, the current code in `useChat.js` does `supabase.from('notifications').insert(...)`.
-- If the user inserting (Sender) is NOT the `user_id` (Recipient), the default RLS `auth.uid() = user_id` would BLOCK it if we copied standard patterns.
-- So we need a policy allowing users to insert notifications for *others*.
-- Policy: "Users can insert notifications for others"
CREATE POLICY "Users can create notifications for others."
ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX notifications_user_id_created_at_idx ON public.notifications(user_id, created_at DESC);
