import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Send, ChevronLeft, Paperclip, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/hooks/useChat'
import { usePresence } from '@/hooks/usePresence'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

export default function Chat() {
    const { id: conversationId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { fetchMessages, sendMessage } = useChat()
    const queryClient = useQueryClient()

    // Activate presence for myself
    usePresence(user?.id)

    const scrollRef = useRef()
    const [messages, setMessages] = useState(() => {
        return queryClient.getQueryData(['messages', conversationId]) || []
    })
    const [input, setInput] = useState('')
    const [otherUser, setOtherUser] = useState(null)

    // Use React Query for caching to prevent constant reload spinners
    const { data: initialMessages, isLoading: messagesLoading } = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => fetchMessages(conversationId),
        enabled: !!conversationId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    })

    const { data: chatUser, isLoading: userLoading } = useQuery({
        queryKey: ['chatUser', conversationId],
        queryFn: async () => {
            const { data: convData } = await supabase
                .from('conversations')
                .select('participant_ids')
                .eq('id', conversationId)
                .single()
            if (!convData) return null
            const otherUserId = convData.participant_ids.find(pid => pid !== user.id) || user.id
            const { data: userData } = await supabase
                .from('users')
                .select('display_name, avatar_url, last_seen')
                .eq('id', otherUserId)
                .single()
            return userData
        },
        enabled: !!conversationId && !!user,
        staleTime: 1000 * 60 * 5,
    })

    // Update state when cached data is available (avoids spinner if in cache)
    useEffect(() => {
        if (initialMessages) setMessages(initialMessages)
    }, [initialMessages])

    useEffect(() => {
        if (chatUser) setOtherUser(chatUser)
    }, [chatUser])

    // Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMsg = payload.new
                    setMessages(prev => {
                        // 0. Deduplicate
                        if (prev.some(m => m.id === newMsg.id)) return prev

                        // Optimistic match
                        const optimisticMatchIndex = prev.findIndex(m =>
                            m.isOptimistic &&
                            m.body === newMsg.body &&
                            m.sender_id === newMsg.sender_id
                        )

                        if (optimisticMatchIndex !== -1) {
                            const newMessages = [...prev]
                            newMessages[optimisticMatchIndex] = newMsg
                            return newMessages
                        }
                        return [...prev, newMsg]
                    })
                    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    // Loading derivation
    const loading = (messagesLoading || userLoading) && messages.length === 0

    // Auto-scroll on messages change
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim()) return

        const text = input.trim()
        setInput('') // Optimistic clear

        // Optimistic Update
        const tempId = 'optimistic-' + Date.now()
        const tempMsg = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: user.id,
            body: text,
            created_at: new Date().toISOString(),
            isOptimistic: true
        }
        setMessages(prev => [...prev, tempMsg])

        try {
            // Send and get the real message back
            const sentMsg = await sendMessage(conversationId, user.id, text)

            // Manually replace optimistic message with real one immediately
            // This ensures UI updates even if Realtime is slow or fails
            setMessages(prev => {
                const index = prev.findIndex(m => m.id === tempId)
                if (index !== -1) {
                    const newMessages = [...prev]
                    newMessages[index] = sentMsg
                    return newMessages
                }
                return prev
            })

        } catch (err) {
            console.error("Failed to send:", err)
            setInput(text) // Restore on fail
            // Remove optimistic message on fail
            setMessages(prev => prev.filter(m => m.id !== tempId))
            alert("Failed to send message")
        }
    }

    // Last Seen Logic
    const getLastSeenText = () => {
        if (!otherUser?.last_seen) return 'Offline'

        const lastSeenDate = new Date(otherUser.last_seen)
        const diffInMinutes = (new Date() - lastSeenDate) / 1000 / 60

        if (diffInMinutes < 2) return 'Online'
        return `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`
    }

    const lastSeenText = getLastSeenText()
    const isOnline = lastSeenText === 'Online'

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

    return (
        <div className="flex flex-col h-screen fixed inset-0 z-50 bg-white">
            {/* Header */}
            <div className="h-16 px-4 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-500">
                        <ChevronLeft size={24} />
                    </button>
                    <Avatar src={otherUser?.avatar_url} alt={otherUser?.display_name} size="sm" />
                    <div>
                        <h3 className="font-bold text-sm">{otherUser?.display_name || 'User'}</h3>
                        <p className={`text-[10px] font-medium ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                            {lastSeenText}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-slate-100 shadow-sm rounded-tl-none'} ${msg.isOptimistic ? 'opacity-70' : ''}`}>
                                <p>{msg.body}</p>
                                <span className={`text-[10px] block mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.isOptimistic && ' • Sending...'}
                                </span>
                            </div>
                        </motion.div>
                    )
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 pb-6 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.02)]">
                <button type="button" className="p-3 text-gray-400 hover:text-primary transition-colors">
                    <Paperclip size={20} />
                </button>
                <div className="flex-1 bg-slate-50 rounded-2xl flex items-center border border-slate-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/10 transition-all">
                    <input
                        className="flex-1 bg-transparent p-3 text-sm focus:outline-none"
                        placeholder="Type a message..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                </div>
                <Button size="icon" className="rounded-full w-11 h-11 !bg-black !text-white hover:!bg-gray-800 border-none" disabled={!input.trim()}>
                    <Send size={18} />
                </Button>
            </form>
        </div>
    )
}
