import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useUnreadMessages() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['unread-messages-count', user?.id],
        queryFn: async () => {
            if (!user) return 0

            // Fetch all conversations user is part of
            const { data, error } = await supabase
                .from('conversations')
                .select('unread_count_per_user')
                .contains('participant_ids', [user.id])

            if (error) {
                console.error('Error fetching unread count:', error)
                return 0
            }

            // Sum up the counts
            const total = data.reduce((acc, curr) => {
                const count = curr.unread_count_per_user?.[user.id] || 0
                return acc + count
            }, 0)

            return total
        },
        enabled: !!user,
        staleTime: Infinity, // handled by subscription
    })

    // Subscription for real-time updates
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel(`conversations-unread:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations',
                    filter: `participant_ids=cs.{${user.id}}` // 'cs' means contains
                    // Note: Supabase Realtime filter syntax for arrays can be tricky.
                    // If 'participant_ids' is an array, generic UPDATE listing is safer if filter fails.
                },
                (payload) => {
                    // Invalidate on conversation update
                    queryClient.invalidateQueries(['unread-messages-count', user.id])
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                () => {
                    // Invalidate on new message (faster than waiting for conversation update)
                    queryClient.invalidateQueries(['unread-messages-count', user.id])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, queryClient])

    return unreadCount
}
