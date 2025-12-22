-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications." 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications." 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to send notifications to each other (e.g. chat)
CREATE POLICY "Users can create notifications for others."
ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX notifications_user_id_created_at_idx ON public.notifications(user_id, created_at DESC);
