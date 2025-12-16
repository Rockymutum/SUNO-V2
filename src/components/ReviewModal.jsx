import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabase'

export default function ReviewModal({ isOpen, onClose, taskId, workerId, reviewerId, onReviewSubmitted }) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (rating === 0) return alert('Please select a rating')

        setLoading(true)
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    task_id: taskId,
                    reviewer_id: reviewerId,
                    worker_id: workerId,
                    rating,
                    comment
                })

            if (error) throw error

            alert('Review submitted successfully!')
            if (onReviewSubmitted) onReviewSubmitted()
            onClose()
        } catch (error) {
            console.error('Error submitting review:', error)
            alert('Failed to submit review')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Rate this Worker</h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                        >
                                            <Star
                                                size={32}
                                                className={`transition-colors ${(hoverRating || rating) >= star
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'fill-gray-100 text-gray-200'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-sm font-medium text-gray-500">
                                    {(hoverRating || rating) === 0 ? 'Select Stars' :
                                        (hoverRating || rating) === 5 ? 'Excellent!' :
                                            (hoverRating || rating) === 4 ? 'Great Job' :
                                                (hoverRating || rating) === 3 ? 'Good' :
                                                    (hoverRating || rating) === 2 ? 'Fair' : 'Poor'}
                                </p>
                            </div>

                            <Textarea
                                placeholder="Share your experience working with this person..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="min-h-[100px] text-base"
                            />

                            <Button
                                onClick={handleSubmit}
                                className="w-full h-12 text-base shadow-lg shadow-black/10"
                                disabled={loading || rating === 0}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Submit Review
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
