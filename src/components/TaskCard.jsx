import { MapPin, Clock, Heart, MessageCircle, Share2, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase, deleteImage } from '@/lib/supabase'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { formatDistanceToNow } from 'date-fns'
import { CommentSection } from './comments/CommentSection'
import { Modal } from '@/components/ui/Modal'

export function TaskCard({ task, onDelete }) {
    // Mock data fallbacks
    const {
        id,
        title = "Untitled Task",
        description,
        budget_min,
        budget_max,
        location = "Unknown Location",
        created_at,
        photos = [],
        creator: _creator
    } = task || {}

    const creator = _creator || { display_name: "Anonymous", avatar_url: null }
    const { user } = useAuth()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(0)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' })
    const menuRef = useRef(null)

    // Fetch initial like state
    useEffect(() => {
        if (!id) return

        const fetchLikes = async () => {
            const { count, error } = await supabase
                .from('task_likes')
                .select('*', { count: 'exact', head: true })
                .eq('task_id', id)

            if (!error) setLikesCount(count || 0)

            if (user) {
                const { data } = await supabase
                    .from('task_likes')
                    .select('task_id')
                    .eq('task_id', id)
                    .eq('user_id', user.id)
                    .maybeSingle()
                if (data) setLiked(true)
            }
        }
        fetchLikes()
    }, [id, user])

    const handleLike = async () => {
        if (!user) {
            navigate('/auth')
            return
        }

        // Optimistic UI update
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(prev => newLiked ? prev + 1 : prev - 1)

        try {
            if (newLiked) {
                const { error } = await supabase
                    .from('task_likes')
                    .insert({ task_id: id, user_id: user.id })
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('task_likes')
                    .delete()
                    .eq('task_id', id)
                    .eq('user_id', user.id)
                if (error) throw error
            }
        } catch (err) {
            console.error('Like failed:', err)
            // Revert on error
            setLiked(!newLiked)
            setLikesCount(prev => !newLiked ? prev + 1 : prev - 1)
        }
    }

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleEdit = () => {
        navigate(`/task/edit/${id}`)
        setMenuOpen(false)
    }

    const confirmDelete = async () => {
        try {
            // Delete images first
            if (photos && photos.length > 0) {
                await Promise.all(photos.map(url => deleteImage(url)))
            }

            const { error, data } = await supabase.from('tasks').delete().eq('id', id).select()
            if (error) throw error

            if (!data || data.length === 0) {
                throw new Error("Deletion failed (likely permission denied)")
            }

            if (onDelete) {
                onDelete(id)
            } else {
                window.location.reload()
            }
        } catch (error) {
            console.error('Error deleting task:', error)
            setErrorModal({ isOpen: true, message: 'Failed to delete task' })
        }
    }

    const handleDeleteClick = () => {
        setMenuOpen(false)
        setIsDeleteModalOpen(true)
    }

    const handleShare = async () => {
        const shareData = {
            title: title,
            text: description,
            url: window.location.origin + `/task/${id}`
        }

        try {
            if (navigator.share) {
                await navigator.share(shareData)
            } else {
                await navigator.clipboard.writeText(shareData.url)
                alert("Link copied to clipboard!")
            }
        } catch (err) {
            console.error('Error sharing:', err)
        }
    }

    const isOwner = user && task.created_by === user.id

    return (
        <Card className="mb-4">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar src={creator.avatar_url} alt={creator.display_name} size="sm" />
                    <div>
                        <p className="text-sm font-bold text-primary">{creator.display_name}</p>
                        <div className="flex items-center text-xs text-muted gap-1">
                            <Clock size={12} />
                            <span>{created_at ? formatDistanceToNow(new Date(created_at), { addSuffix: true }) : 'Just now'}</span>
                            <span>•</span>
                            <MapPin size={12} />
                            <span>{location}</span>
                        </div>
                    </div>
                </div>
                {isOwner && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="text-gray-400 hover:text-primary transition-colors p-1"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-10 overflow-hidden py-1"
                                >
                                    <button
                                        onClick={handleEdit}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Edit size={14} />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={handleDeleteClick}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        <span>Delete</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Hero Image */}
            {photos.length > 0 && (
                <Link to={`/task/${id}`} className="block w-full h-56 bg-gray-100 overflow-hidden relative active:opacity-90 transition-opacity">
                    <img src={photos[0]} alt={title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-3 right-3">
                        <Badge className="bg-white/90 backdrop-blur text-primary font-bold shadow-sm">
                            ₹{budget_min} - ₹{budget_max}
                        </Badge>
                    </div>
                </Link>
            )}

            {/* Content */}
            {/* Content */}
            <div className="p-4 pt-3">
                {photos.length === 0 && (
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="border-slate-200">Plumbing</Badge>
                        <span className="font-bold text-sm">₹{budget_min} - ₹{budget_max}</span>
                    </div>
                )}
                <Link to={`/task/${id}`} className="block group">
                    <h3 className="text-lg font-bold mb-1 leading-snug group-hover:text-primary/80 transition-colors">{title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                        {description || "No description provided"}
                    </p>
                </Link>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                <div className="flex gap-4">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 transition-colors text-sm font-medium group ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                    >
                        <Heart size={18} className={`transition-transform group-hover:scale-110 ${liked ? 'fill-current' : ''}`} />
                        <span>{likesCount > 0 ? likesCount : 'Likes'}</span>
                    </button>
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className={`flex items-center gap-1.5 transition-colors text-sm font-medium ${showComments ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}
                    >
                        <MessageCircle size={18} className={showComments ? "fill-current" : ""} />
                        <span>Comments</span>
                    </button>
                </div>
                <button
                    onClick={handleShare}
                    className="text-gray-400 hover:text-primary transition-colors">
                    <Share2 size={18} />
                </button>
            </div>

            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <CommentSection taskId={id} onClose={() => setShowComments(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Task"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">Are you sure you want to delete this task? This cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ isOpen: false, message: '' })}
                title="Error"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">{errorModal.message}</p>
                    <Button onClick={() => setErrorModal({ isOpen: false, message: '' })}>Close</Button>
                </div>
            </Modal>
        </Card>
    )
}
