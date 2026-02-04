import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/context/AuthContext'
import { Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SUPPORT_USER_ID } from '@/lib/constants'

export default function Messages() {
    const { user } = useAuth()
    const { fetchConversations, getOrCreateConversation } = useChat()
    const navigate = useNavigate()
    const [contactingSupport, setContactingSupport] = useState(false)

    // Link is already supported via static import

    const { data: conversations = [], isLoading: loading } = useQuery({
        queryKey: ['conversations', user?.id],
        queryFn: () => fetchConversations(user.id),
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const handleContactSupport = async () => {
        if (!user) return
        setContactingSupport(true)
        try {
            const convoId = await getOrCreateConversation(user.id, SUPPORT_USER_ID)
            navigate(`/messages/${convoId}`)
        } catch (err) {
            console.error(err)
            alert("Failed to connect to support.")
        } finally {
            setContactingSupport(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center pt-20">
                <Loader2 className="animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="pb-20 pt-6 px-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            </div>

            {/* Support Action Card */}
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <MessageCircle size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Need help?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Our support team is here to assist you with any questions or issues.
                    </p>
                </div>
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                    onClick={handleContactSupport}
                    disabled={contactingSupport}
                >
                    {contactingSupport ? <Loader2 className="animate-spin mr-2" size={18} /> : <MessageCircle className="mr-2" size={18} />}
                    {contactingSupport ? 'Connecting...' : 'Chat with Support'}
                </Button>
            </div>

            {/* 
                Strict Support Policy: 
                Regular users cannot see old messages to prevent continuing chats.
                BUT, the Support Admin (user.id === SUPPORT_USER_ID) MUST see the inbox.
            */}
            {user?.id === SUPPORT_USER_ID && conversations.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Support Inbox</h2>
                    <div className="space-y-1">
                        {conversations.map(conv => {
                            const otherUser = conv.other_user
                            return (
                                <Link
                                    key={conv.id}
                                    to={`/messages/${conv.id}`}
                                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all"
                                >
                                    <Avatar src={otherUser.avatar_url} alt={otherUser.display_name} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-sm text-gray-900 truncate">
                                                {otherUser.display_name || 'Unknown User'}
                                            </h3>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm truncate text-gray-500 mt-0.5">
                                            {conv.last_message || 'No messages'}
                                        </p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
