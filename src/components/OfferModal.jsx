import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function OfferModal({ task, isOpen, onClose, onOfferSubmitted }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        price: '',
        message: ''
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!user) return

        try {
            const { error } = await supabase
                .from('applications')
                .insert({
                    task_id: task.id,
                    worker_id: user.id,
                    offer_price: formData.price,
                    message: formData.message,
                    status: 'pending'
                })

            if (error) throw error

            onOfferSubmitted()
            onClose()
            setFormData({ price: '', message: '' })
        } catch (error) {
            console.error('Error submitting offer:', error)
            alert('Failed to submit offer')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-[70] max-w-md mx-auto"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Make an Offer</h2>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Your Price (₹)"
                                type="number"
                                required
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                placeholder={`Budget: ₹${task.budget_min} - ₹${task.budget_max}`}
                            />

                            <Textarea
                                label="Pitch"
                                required
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Why are you the best fit for this job?"
                                rows={4}
                            />

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Submit Offer
                            </Button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
