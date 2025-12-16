import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/context/AuthContext'
import { Send, Loader2, ArrowRight } from 'lucide-react'
import { CommentItem } from './CommentItem'

export function CommentSection({ taskId, onClose }) {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchComments()

        // Realtime subscription
        const channel = supabase
            .channel(`comments:${taskId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'comments',
                    filter: `task_id=eq.${taskId}`
                },
                () => {
                    fetchComments()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [taskId])

    const fetchComments = async () => {
        try {
            // Fetch comments and joined user data + generic likes (optional optimization: separate likes count)
            // Ideally we also fetch 'user_has_liked' but let's do simplified fetch first
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    user:users!comments_user_id_fkey(display_name, avatar_url),
                    comment_likes(count)
                `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: true })

            if (error) throw error

            // Organize into tree
            const roots = []
            const map = {}

            // Pre-process: add reply container
            data.forEach(c => {
                c.replies = []
                c.likes_count = c.comment_likes?.[0]?.count || 0 // Assuming simple count implementation or need exact 'count' agg
                // Fix: comment_likes(count) returns array of objects with count property if using HEAD/count approach, 
                // but PostgREST select count is tricky inline without view.
                // Let's assume standard count for now, or fetch likes separately if needed.
                // Actually supabase .select(..., comment_likes(count)) gives [{count: N}]
                map[c.id] = c
            })

            data.forEach(c => {
                if (c.parent_id && map[c.parent_id]) {
                    map[c.parent_id].replies.push(c)
                } else {
                    roots.push(c)
                }
            })

            setComments(roots)
        } catch (err) {
            console.error('Error fetching comments:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user) {
            navigate('/auth')
            return
        }
        if (!newComment.trim()) return

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    task_id: taskId,
                    user_id: user.id,
                    content: newComment.trim(),
                    parent_id: null // Top level
                })

            if (error) throw error
            setNewComment('')
            fetchComments() // Manual refresh for instant feedback
        } catch (err) {
            console.error('Error adding comment:', err)
            alert('Failed to post comment')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="bg-slate-50 border-t border-gray-100 p-4 rounded-b-xl -mx-4 -mb-4 pt-6">
            <h3 className="font-bold text-sm mb-4">Comments</h3>

            {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : (
                <div className="space-y-4 mb-6">
                    {comments.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-2">No comments yet. Be the first!</p>
                    ) : (
                        comments.map(comment => (
                            <CommentItem key={comment.id} comment={comment} taskId={taskId} onRefresh={fetchComments} />
                        ))
                    )}
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <Avatar
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                    alt={profile?.display_name || user?.user_metadata?.display_name || user?.email || '?'}
                    size="sm"
                    className="mb-1"
                />
                <div className="flex-1 relative">
                    <textarea
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 min-h-[44px] max-h-[150px] resize-none overflow-hidden"
                        placeholder="Write a comment..."
                        value={newComment}
                        rows={1}
                        onChange={e => {
                            setNewComment(e.target.value)
                            e.target.style.height = 'auto'
                            e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSubmit(e)
                            }
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-1 right-1 h-8 w-8 rounded-lg p-0 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:bg-transparent"
                        disabled={!newComment.trim() || submitting}
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={20} />}
                    </Button>
                </div>

            </form >
        </div >
    )
}
