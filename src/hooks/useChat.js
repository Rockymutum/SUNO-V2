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
            // We need to fetch conversations where the user is a participant
            // And also join with the OTHER user's details.
            // This is tricky with simple Supabase queries because participant_ids is an array.
            // Ideally we use a View, but let's try a client-side join or specific RPC if needed.
            // For now, simpler approach: Fetch convos, then fetch user details for the other ID.

            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .contains('participant_ids', [userId])
                .order('last_message_at', { ascending: false })

            if (error) throw error

            // Enhance with other user's profile
            const enhancedData = await Promise.all(data.map(async (conv) => {
                const otherUserId = conv.participant_ids.find(id => id !== userId) || userId // Fallback to self if self-chat
                const { data: userData } = await supabase
                    .from('users')
                    .select('display_name, avatar_url, last_seen')
                    .eq('id', otherUserId)
                    .single()

                return {
                    ...conv,
                    other_user: userData || { display_name: 'Unknown User', avatar_url: null }
                }
            }))

            return enhancedData
        } catch (err) {
            console.error('Error fetching conversations:', err)
            setError(err)
            return []
        }
    }, [])

    const fetchMessages = useCallback(async (conversationId) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data
        } catch (err) {
            console.error('Error fetching messages:', err)
            throw err
        }
    }, [])

    const sendMessage = useCallback(async (conversationId, senderId, text) => {
        try {
            // 1. Insert the message
            const { data: messageData, error: messageError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: senderId,
                    body: text,
                    read: false
                })
                .select()
                .single()

            if (messageError) throw messageError

            // 2. Fetch current conversation to get unread counts
            // We need to do this to atomically-ish update the JSONB
            const { data: convData, error: convError } = await supabase
                .from('conversations')
                .select('unread_count_per_user, participant_ids')
                .eq('id', conversationId)
                .single()

            if (convError) console.error('Error fetching conv for update:', convError)

            const participants = convData?.participant_ids || []
            const otherUserId = participants.find(id => id !== senderId)

            // Calculate new counts
            const currentCounts = convData?.unread_count_per_user || {}
            const newCounts = { ...currentCounts }
            if (otherUserId) {
                newCounts[otherUserId] = (newCounts[otherUserId] || 0) + 1
            }

            // 3. Update conversation last_message AND unread counts
            await supabase
                .from('conversations')
                .update({
                    last_message: text,
                    last_message_at: new Date(),
                    unread_count_per_user: newCounts
                })
                .eq('id', conversationId)

            // 4. Create Notification for the recipient
            if (otherUserId) {
                // Fetch sender name (optimization: could be passed in, but safe to fetch here)
                const { data: senderProfile } = await supabase
                    .from('users')
                    .select('display_name')
                    .eq('id', senderId)
                    .single()

                const senderName = senderProfile?.display_name || 'User'

                const { data: notifData, error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: otherUserId,
                        title: `New message from ${senderName}`,
                        body: text, // Truncate if too long? UI handles it.
                        data: { url: `/messages/${conversationId}` },
                        is_read: false
                    })
                    .select()
                    .single()

                // Trigger Push Notification directly (Client-side trigger)
                // This ensures push works even if DB Webhook is missing
                if (!notifError) {
                    supabase.functions.invoke('push-notification', {
                        body: {
                            type: 'INSERT',
                            record: {
                                user_id: otherUserId,
                                title: `New message from ${senderName}`,
                                body: text,
                                data: { url: `/messages/${conversationId}` }
                            }
                        }
                    }).catch(console.error) // Fire and forget
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['conversations'] })

            return messageData

        } catch (err) {
            console.error('Error sending message:', err)
            throw err
        }
    }, [])

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
                .single()

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
                .single()

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

    return {
        loading,
        error,
        fetchConversations,
        fetchMessages,
        sendMessage,
        getOrCreateConversation,
        markAsRead
    }
}
