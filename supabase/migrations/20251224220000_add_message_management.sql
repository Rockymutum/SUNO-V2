-- Add edited_at column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add RLS policy for updating own messages
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Add RLS policy for deleting own messages (hard delete)
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- Add RLS policy for deleting conversations
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations"
ON public.conversations FOR DELETE
USING (auth.uid() = ANY(participant_ids));
