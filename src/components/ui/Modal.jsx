import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-4">
                        {title && <h2 className="text-lg font-bold uppercase tracking-wide">{title}</h2>}
                        <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    {children}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    )
}
