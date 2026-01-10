-- Migration: 20260110120000_chat_refactor.sql

-- ==========================================
-- Task 1: Atomic Message Sending (RPC)
-- ==========================================

-- Drop first to allow return type changes if it exists
DROP FUNCTION IF EXISTS public.send_message_atomic(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.send_message_atomic(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to ensure updates happen
SET search_path = public
AS $$
DECLARE
    v_message_id UUID;
    v_message_created_at TIMESTAMPTZ;
    v_participants UUID[];
    v_other_user_id UUID;
    v_unread_counts JSONB;
    v_new_counts JSONB;
    v_sender_name TEXT;
    v_msg_data JSONB;
BEGIN
    -- 1. Insert Message
    INSERT INTO public.messages (conversation_id, sender_id, body, read)
    VALUES (p_conversation_id, p_sender_id, p_body, false)
    RETURNING id, created_at, conversation_id, sender_id, body, read, edited_at 
    INTO v_message_id, v_message_created_at, v_msg_data;
    
    -- Format return data same as a select
    v_msg_data = jsonb_build_object(
        'id', v_message_id,
        'created_at', v_message_created_at,
        'conversation_id', p_conversation_id,
        'sender_id', p_sender_id,
        'body', p_body,
        'read', false,
        'edited_at', null
    );

    -- 2. Get Conversation Details (Participants & Current Counts)
    SELECT participant_ids, unread_count_per_user 
    INTO v_participants, v_unread_counts
    FROM public.conversations
    WHERE id = p_conversation_id
    FOR UPDATE; -- Lock row to prevent race conditions

    -- 3. Calculate New Counts
    -- Identify 'other' user. If self-chat, other is same.
    IF array_length(v_participants, 1) > 1 THEN
        -- Find the first participant that isn't the sender
        SELECT p INTO v_other_user_id 
        FROM unnest(v_participants) p 
        WHERE p != p_sender_id 
        LIMIT 1;
    ELSE
        -- Fallback for weird data or self-chat
        v_other_user_id := p_sender_id;
    END IF;

    v_new_counts := v_unread_counts;
    
    -- Initialize if null
    IF v_new_counts IS NULL THEN
        v_new_counts := '{}'::jsonb;
    END IF;

    -- Increment for other user
    IF v_other_user_id IS NOT NULL THEN
        -- coalesce to handle missing keys
        v_new_counts := jsonb_set(
            v_new_counts, 
            array[v_other_user_id::text], 
            to_jsonb(COALESCE((v_new_counts->>v_other_user_id::text)::int, 0) + 1)
        );
    END IF;

    -- 4. Update Conversation
    UPDATE public.conversations
    SET 
        last_message = p_body,
        last_message_at = v_message_created_at,
        unread_count_per_user = v_new_counts
    WHERE id = p_conversation_id;

    -- 5. Create Notification (Security Task: Moved into RPC)
    -- Only create if it's for another user
    IF v_other_user_id IS NOT NULL AND v_other_user_id != p_sender_id THEN
        -- Fetch sender name
        SELECT display_name INTO v_sender_name 
        FROM public.users 
        WHERE id = p_sender_id;
        
        IF v_sender_name IS NULL THEN 
            v_sender_name := 'Someone'; 
        END IF;

        INSERT INTO public.notifications (user_id, title, body, data)
        VALUES (
            v_other_user_id,
            'New message from ' || v_sender_name,
            p_body, -- Truncation is UI job usually, but we could substr here if needed
            jsonb_build_object('url', '/messages/' || p_conversation_id)
        );
    END IF;

    RETURN v_msg_data;
END;
$$;


-- ==========================================
-- Task 2: N+1 Query Fix (View)
-- ==========================================
-- Create a view that expands conversation participants so we can join user details
-- This allows: .from('user_conversations').select('*').eq('user_id', my_auth_id)

CREATE OR REPLACE VIEW public.user_conversations AS
SELECT 
    c.id AS conversation_id,
    c.last_message,
    c.last_message_at,
    c.unread_count_per_user,
    participant.id AS user_id, -- The user "viewing" (Owner of the row in this view context)
    other_user.id AS other_user_id,
    other_user.display_name AS other_user_display_name,
    other_user.avatar_url AS other_user_avatar_url,
    other_user.last_seen AS other_user_last_seen,
    c.participant_ids
FROM 
    public.conversations c
    -- Cross join to explode all participants -> "This row is relevant for Participant X"
    CROSS JOIN LATERAL unnest(c.participant_ids) AS participant_id
    JOIN public.users participant ON participant.id = participant_id
    -- Join again to find the "Other" user
    -- Logic: The other user is the element in participant_ids that is NOT the current participant_id
    -- If it's a self-chat, it's the same.
    CROSS JOIN LATERAL (
        SELECT u.*
        FROM unnest(c.participant_ids) pid
        JOIN public.users u ON u.id = pid
        WHERE (array_length(c.participant_ids, 1) > 1 AND u.id != participant.id)
           OR (array_length(c.participant_ids, 1) = 1 AND u.id = participant.id) -- Self chat
        LIMIT 1 -- Handle just one other partner for now (1-on-1 chat assumption)
    ) other_user;

-- Grant access to the view
GRANT SELECT ON public.user_conversations TO authenticated;


-- ==========================================
-- Task 3: Security (Notifications)
-- ==========================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "System/Anyone can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for others." ON public.notifications;

-- Create strict policy
-- Since we moved notification creation to the atomic RPC (which is SECURITY DEFINER), 
-- users DO NOT need INSERT permissions on the table directly anymore for messages!
-- However, we should still allow system service role or strict insert if needed.
-- For now, we block all client-side inserts except for self (maybe?).
-- Actually, let's strictly limit it: Users can only see their own.
-- If other features need to create notifications client-side, we can add specific RPCs or strict policies later.
-- For now, "Users can view their own" is already there. Assumed "Users can update their own" is there.

-- We leave NO insert policy for authenticated users, effectively disabling client-side inserts.
-- This stops the spam.
