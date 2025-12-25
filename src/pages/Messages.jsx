import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/context/AuthContext'
import { Loader2, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export default function Messages() {
    const { user } = useAuth()
    const { fetchConversations, deleteConversation } = useChat()
    const [deleteConfirmModal, setDeleteConfirmModal] = useState(false)
    const [selectedConversation, setSelectedConversation] = useState(null)

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

    const handleDeleteClick = (e, conv) => {
        e.preventDefault() // Prevent navigation
        e.stopPropagation()
        setSelectedConversation(conv)
        setDeleteConfirmModal(true)
    }

    const confirmDelete = async () => {
        try {
            await deleteConversation(selectedConversation.id)
            setDeleteConfirmModal(false)
            setSelectedConversation(null)
        } catch (err) {
            alert('Failed to delete conversation')
        }
    }

    return (
        <div className="pb-20 pt-2 space-y-1">
            {conversations.map(conv => {
                const otherUser = conv.other_user
                const unreadCount = conv.unread_count_per_user?.[user.id] || 0
                const isUnread = unreadCount > 0

                return (
                    <div key={conv.id} className="relative">
                        <Link
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
                            <div className="flex-1 min-w-0 pr-12">
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
                        <button
                            onClick={(e) => handleDeleteClick(e, conv)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )
            })}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmModal}
                onClose={() => setDeleteConfirmModal(false)}
                title="Delete Conversation"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to delete this conversation with <strong>{selectedConversation?.other_user?.display_name}</strong>?
                        All messages will be permanently deleted.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setDeleteConfirmModal(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
