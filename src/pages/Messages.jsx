import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function Messages() {
    const { user } = useAuth()
    const { fetchConversations } = useChat()

    const { data: conversations = [], isLoading: loading } = useQuery({
        queryKey: ['conversations', user?.id],
        queryFn: () => fetchConversations(user.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    if (loading) {
        return (
            <div className="flex justify-center pt-20">
                <Loader2 className="animate-spin text-primary" />
            </div>
        )
    }

    if (conversations.length === 0) {
        return (
            <div className="pt-20 text-center text-gray-500 px-4">
                <p>No messages yet.</p>
                <p className="text-sm mt-2">Find a worker and start a conversation!</p>
            </div>
        )
    }

    return (
        <div className="pb-20 pt-2 space-y-1">
            {conversations.map(conv => {
                const otherUser = conv.other_user
                // Determine unread count logic if feasible, currently simplified
                const isUnread = false // Logic needed based on read_status table or array

                return (
                    <Link
                        key={conv.id}
                        to={`/messages/${conv.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                        <div className="relative">
                            <Avatar src={otherUser.avatar_url} alt={otherUser.display_name} size="md" />
                            {isUnread && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                                    !
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="font-bold text-sm text-gray-900 truncate">{otherUser.display_name || 'Unknown User'}</h3>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                    {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true }) : ''}
                                </span>
                            </div>
                            <p className="text-sm truncate text-gray-500">
                                {conv.last_message || 'Start chatting...'}
                            </p>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
