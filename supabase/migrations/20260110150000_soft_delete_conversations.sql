-- Migration: 20260110150000_soft_delete_conversations.sql

-- 1. Alter Table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS deleted_for UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cleared_history_at JSONB DEFAULT '{}'::jsonb;

-- 2. Update View to hide deleted conversations
DROP VIEW IF EXISTS public.user_conversations CASCADE;

CREATE OR REPLACE VIEW public.user_conversations AS
SELECT 
    c.id AS conversation_id,
    c.last_message,
    c.last_message_at,
    c.unread_count_per_user,
    c.cleared_history_at, -- Expose this for filtering messages
    participant.id AS user_id,
    other_user.id AS other_user_id,
    other_user.display_name AS other_user_display_name,
    other_user.avatar_url AS other_user_avatar_url,
    other_user.last_seen AS other_user_last_seen,
    c.participant_ids
FROM 
    public.conversations c
    CROSS JOIN LATERAL unnest(c.participant_ids) AS participant_id
    JOIN public.users participant ON participant.id = participant_id
    CROSS JOIN LATERAL (
        SELECT u.*
        FROM unnest(c.participant_ids) pid
        JOIN public.users u ON u.id = pid
        WHERE (array_length(c.participant_ids, 1) > 1 AND u.id != participant.id)
           OR (array_length(c.participant_ids, 1) = 1 AND u.id = participant.id)
        LIMIT 1
    ) other_user
WHERE 
    -- Filter out if the current user (participant.id) has soft-deleted this conversation
    NOT (participant.id = ANY(COALESCE(c.deleted_for, '{}')));

GRANT SELECT ON public.user_conversations TO authenticated;

-- 3. New RPC: Soft Delete Conversation
CREATE OR REPLACE FUNCTION public.delete_conversation_for_user(
    p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    
    -- Update conversation:
    -- 1. Add user to deleted_for array (if not already there)
    -- 2. Update cleared_history_at timestamp for this user
    UPDATE public.conversations
    SET 
        deleted_for = CASE 
            WHEN NOT (v_uid = ANY(deleted_for)) THEN deleted_for || v_uid 
            ELSE deleted_for 
        END,
        cleared_history_at = cleared_history_at || jsonb_build_object(v_uid::text, now())
    WHERE id = p_conversation_id
    AND v_uid = ANY(participant_ids); -- Security check: only participants can delete

    RETURN jsonb_build_object('success', true);
END;
$$;


-- 4. Update send_message_atomic to "Revive" conversation (remove from deleted_for)
CREATE OR REPLACE FUNCTION public.send_message_atomic(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
    RETURNING id, created_at 
    INTO v_message_id, v_message_created_at;
    
    v_msg_data = jsonb_build_object(
        'id', v_message_id,
        'created_at', v_message_created_at,
        'conversation_id', p_conversation_id,
        'sender_id', p_sender_id,
        'body', p_body,
        'read', false,
        'edited_at', null
    );

    -- 2. Get Conversation Details
    SELECT participant_ids, unread_count_per_user 
    INTO v_participants, v_unread_counts
    FROM public.conversations
    WHERE id = p_conversation_id
    FOR UPDATE;

    -- 3. Calculate New Counts
    IF array_length(v_participants, 1) > 1 THEN
        SELECT p INTO v_other_user_id 
        FROM unnest(v_participants) p 
        WHERE p != p_sender_id 
        LIMIT 1;
    ELSE
        v_other_user_id := p_sender_id;
    END IF;

    v_new_counts := v_unread_counts;
    IF v_new_counts IS NULL THEN
        v_new_counts := '{}'::jsonb;
    END IF;

    IF v_other_user_id IS NOT NULL THEN
        v_new_counts := v_new_counts || jsonb_build_object(
            v_other_user_id::text, 
            COALESCE((v_new_counts->>v_other_user_id::text)::int, 0) + 1
        );
    END IF;

    -- 4. Update Conversation
    -- ADDED: logic to remove participants from 'deleted_for' to revive chat
    UPDATE public.conversations
    SET 
        last_message = p_body,
        last_message_at = v_message_created_at,
        unread_count_per_user = v_new_counts,
        deleted_for = array_remove(array_remove(COALESCE(deleted_for, '{}'), p_sender_id), v_other_user_id)
    WHERE id = p_conversation_id;

    -- 5. Create Notification
    IF v_other_user_id IS NOT NULL AND v_other_user_id != p_sender_id THEN
        SELECT display_name INTO v_sender_name FROM public.users WHERE id = p_sender_id;
        IF v_sender_name IS NULL THEN v_sender_name := 'Someone'; END IF;

        INSERT INTO public.notifications (user_id, title, body, data)
        VALUES (
            v_other_user_id,
            'New message from ' || v_sender_name,
            p_body, 
            jsonb_build_object('url', '/messages/' || p_conversation_id)
        );
    END IF;

    RETURN v_msg_data;
END;
$$;
