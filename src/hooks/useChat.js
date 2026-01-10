import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export function useChat() {
    const queryClient = useQueryClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Fetch all conversations for the current user
    const fetchConversations = useCallback(async (userId) => {
        if (!userId) return []
        try {
            // Task 2: Fix N+1 - Use the new View 'user_conversations'
            const { data, error } = await supabase
                .from('user_conversations')
                .select('*')
                .eq('user_id', userId)
                .order('last_message_at', { ascending: false })

            if (error) throw error

            // Map view results to expected shape (nested other_user object)
            const formatted = data.map(conv => ({
                id: conv.conversation_id,
                created_at: conv.last_message_at,
                last_message: conv.last_message,
                last_message_at: conv.last_message_at,
                participant_ids: conv.participant_ids,
                unread_count_per_user: conv.unread_count_per_user,
                cleared_history_at: conv.cleared_history_at, // Map this new field
                other_user: {
                    id: conv.other_user_id,
                    display_name: conv.other_user_display_name || 'Unknown User',
                    avatar_url: conv.other_user_avatar_url,
                    last_seen: conv.other_user_last_seen
                }
            }))

            return formatted
        } catch (err) {
            console.error('Error fetching conversations:', err)
            setError(err)
            return []
        }
    }, [])

    const fetchMessages = useCallback(async (conversationId) => {
        try {
            // 1. Get current user
            const { data: { user } } = await supabase.auth.getUser()

            let clearedAt = null
            if (user) {
                // 2. Check clear history timestamp
                const { data: conv } = await supabase
                    .from('conversations')
                    .select('cleared_history_at')
                    .eq('id', conversationId)
                    .maybeSingle()

                clearedAt = conv?.cleared_history_at?.[user.id]
            }

            // 3. Query messages
            let query = supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (clearedAt) {
                query = query.gt('created_at', clearedAt)
            }

            const { data, error } = await query

            if (error) throw error
            return data
        } catch (err) {
            console.error('Error fetching messages:', err)
            throw err
        }
    }, [])

    const sendMessage = useCallback(async (conversationId, senderId, text) => {
        try {
            // Task 1: Atomic RPC Call
            const { data: messageData, error } = await supabase
                .rpc('send_message_atomic', {
                    p_conversation_id: conversationId,
                    p_sender_id: senderId,
                    p_body: text
                })

            if (error) throw error

            // Task 3: Security - Notification creation is now handled inside the RPC.
            // We do not need to insert into 'notifications' from the client anymore.

            // Note: The previous client-side push trigger is removed in favor of 
            // Database-side logic or Database Webhooks listening to the 'notifications' insert.

            await queryClient.invalidateQueries({ queryKey: ['conversations'] })

            return messageData

        } catch (err) {
            console.error('Error sending message:', err)
            throw err
        }
    }, [queryClient])

    const getOrCreateConversation = useCallback(async (currentUserId, otherUserId) => {
        try {
            // 1. Check if conversation exists
            // Since we use array columns, it's slightly hard to match exact pair with pure PostgREST eq.
            // standard approach: filtering logic.
            // Check if there is a conversation with BOTH ids.

            // Note: .contains() works for checking if array contains specified elements.
            // But we want exact pair usually. 
            // array_length(participant_ids) = 2 AND participants @> [id1, id2]

            // Client side filter might be safest for now if volume is low, 
            // OR finding all my convos and checking if otherUser is in them.

            const { data: existingConvos } = await supabase
                .from('conversations')
                .select('*')
                .contains('participant_ids', [currentUserId, otherUserId])

            // Filter strictly for this pair just in case (e.g. groups later)
            const match = existingConvos?.find(c =>
                c.participant_ids.length === 2 &&
                c.participant_ids.includes(currentUserId) &&
                c.participant_ids.includes(otherUserId)
            )

            if (match) return match.id

            // 2. Create new if not found
            const { data: newConvo, error } = await supabase
                .from('conversations')
                .insert({
                    participant_ids: [currentUserId, otherUserId],
                    last_message: 'Started a new conversation',
                    unread_count_per_user: { [currentUserId]: 0, [otherUserId]: 0 }
                })
                .select()
                .maybeSingle()

            if (error) throw error
            return newConvo.id

        } catch (err) {
            console.error('Error resolving conversation:', err)
            throw err
        }
    }, [])

    const markAsRead = useCallback(async (conversationId, userId) => {
        try {
            // 1. Fetch current counts to update safely
            const { data: convData } = await supabase
                .from('conversations')
                .select('unread_count_per_user')
                .eq('id', conversationId)
                .maybeSingle()

            if (convData) {
                const currentCounts = convData.unread_count_per_user || {}
                // Only update if count > 0
                if (currentCounts[userId] > 0) {
                    const newCounts = { ...currentCounts, [userId]: 0 }
                    await supabase
                        .from('conversations')
                        .update({ unread_count_per_user: newCounts })
                        .eq('id', conversationId)
                }
            }

            // 2. Mark messages as read (optional but good for consistency)
            // We don't really use this for the badge but good for history
            /* 
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('conversation_id', conversationId)
                .neq('sender_id', userId)
                .is('read', false) 
            */

            await queryClient.invalidateQueries({ queryKey: ['conversations'] })
        } catch (err) {
            console.error('Error marking as read:', err)
        }
    }, [queryClient])

    // Edit a message
    const editMessage = useCallback(async (messageId, newText) => {
        try {
            const { error } = await supabase
                .from('messages')
                .update({
                    body: newText,
                    edited_at: new Date().toISOString()
                })
                .eq('id', messageId)

            if (error) throw error

            // Invalidate queries to refresh UI
            await queryClient.invalidateQueries({ queryKey: ['messages'] })
            return true
        } catch (err) {
            console.error('Error editing message:', err)
            throw err
        }
    }, [queryClient])

    // Delete a message (hard delete from database)
    const deleteMessage = useCallback(async (messageId, conversationId) => {
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId)

            if (error) throw error

            // Update conversation's last_message if needed
            // Fetch the latest message for this conversation
            const { data: latestMessage } = await supabase
                .from('messages')
                .select('body, created_at')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            // Update conversation
            await supabase
                .from('conversations')
                .update({
                    last_message: latestMessage?.body || null,
                    last_message_at: latestMessage?.created_at || new Date().toISOString()
                })
                .eq('id', conversationId)

            // Invalidate queries
            await queryClient.invalidateQueries({ queryKey: ['messages'] })
            await queryClient.invalidateQueries({ queryKey: ['conversations'] })
            return true
        } catch (err) {
            console.error('Error deleting message:', err)
            throw err
        }
    }, [queryClient])

    // Soft delete conversation for current user
    const deleteConversation = useCallback(async (conversationId) => {
        try {
            const { error } = await supabase
                .rpc('delete_conversation_for_user', {
                    p_conversation_id: conversationId
                })

            if (error) throw error

            // Invalidate queries
            await queryClient.invalidateQueries({ queryKey: ['conversations'] })
            return true
        } catch (err) {
            console.error('Error deleting conversation:', err)
            throw err
        }
    }, [queryClient])

    return {
        loading,
        error,
        fetchConversations,
        fetchMessages,
        sendMessage,
        getOrCreateConversation,
        markAsRead,
        editMessage,
        deleteMessage,
        deleteConversation
    }
}
