import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import { Heart, Reply, Trash2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export function CommentItem({ comment, taskId, onRefresh }) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [replying, setReplying] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // We handle immediate state for likes to make it snappy, though Realtime will also update
    const [liked, setLiked] = useState(false) // Simplification: ideally we fetch 'is_liked' from DB
    const [likesCount, setLikesCount] = useState(comment.likes_count || 0)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'error' })

    const isOwner = user?.id === comment.user_id

    const handleLike = async () => {
        if (!user) { navigate('/auth'); return }

        // Optimistic
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1)

        try {
            if (newLiked) {
                await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: comment.id })
            } else {
                await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', comment.id)
            }
        } catch (err) {
            console.error("Like failed", err)
            // Revert
            setLiked(!newLiked)
            setLikesCount(prev => !newLiked ? prev + 1 : prev - 1)
        }
    }

    const confirmDelete = async () => {
        try {
            const { error } = await supabase.from('comments').delete().eq('id', comment.id)
            if (error) throw error
            if (onRefresh) onRefresh()
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Error', message: 'Failed to delete comment', type: 'error' })
        }
    }

    const handleDeleteClick = () => setDeleteModalOpen(true)

    const handleReply = async (e) => {
        e.preventDefault()
        if (!user) { navigate('/auth'); return }
        if (!replyText.trim()) return

        setSubmitting(true)
        try {
            const { error } = await supabase.from('comments').insert({
                task_id: taskId,
                user_id: user.id,
                content: replyText.trim(),
                parent_id: comment.id
            })
            if (error) throw error
            setReplyText('')
            setReplying(false)
            if (onRefresh) onRefresh()
        } catch (err) {
            setInfoModal({ isOpen: true, title: 'Error', message: 'Failed to reply', type: 'error' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
                <Avatar src={comment.user?.avatar_url} size="sm" />
                {comment.replies?.length > 0 && <div className="w-px h-full bg-gray-100 my-1" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{comment.user?.display_name || 'User'}</span>
                        <span className="text-[10px] text-gray-400">
                            {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-1 pl-2">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Heart size={12} className={liked ? 'fill-current' : ''} />
                        {likesCount > 0 && <span>{likesCount}</span>}
                        <span className="sr-only">Like</span>
                    </button>

                    <button
                        onClick={() => setReplying(!replying)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                    >
                        <Reply size={12} />
                        <span>Reply</span>
                    </button>

                    {isOwner && (
                        <button
                            onClick={handleDeleteClick}
                            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {replying && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={handleReply}
                            className="mt-2 flex gap-2"
                        >
                            <div className="flex-1 relative">
                                <input
                                    autoFocus
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                    placeholder={`Reply to ${comment.user?.display_name}...`}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-2 text-primary hover:text-primary/80 disabled:opacity-50"
                                    disabled={!replyText.trim() || submitting}
                                >
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Reply size={14} />}
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} taskId={taskId} onRefresh={onRefresh} />
                        ))}
                    </div>
                )}
            </div>


            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Comment"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">Delete this comment? This action cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={infoModal.isOpen}
                onClose={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
                title={infoModal.title}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">{infoModal.message}</p>
                    <Button className="w-full" onClick={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}>Okay</Button>
                </div>
            </Modal>
        </div >
    )
}
