import { useState, useRef, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

export function Select({ label, value, onChange, options, placeholder = "Select option", name, className, error }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedOption = options.find(opt => opt.value === value)

    const handleSelect = (optionValue) => {
        // Create a synthetic event to match standard input onChange behavior if needed, 
        // or just pass the value. But since the parent uses a generic handleChange taking event,
        // we'll construct a mock event.
        const mockEvent = {
            target: {
                name: name,
                value: optionValue
            }
        }
        onChange(mockEvent)
        setIsOpen(false)
    }

    return (
        <div className="w-full space-y-1.5" ref={containerRef}>
            {label && <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={twMerge(
                        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-left flex items-center justify-between focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
                        className
                    )}
                >
                    <span className={!selectedOption ? "text-slate-400" : "text-gray-900"}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronLeft
                        size={20}
                        className={twMerge("text-gray-400 transition-transform duration-200", isOpen ? "rotate-90" : "-rotate-90")}
                    />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                        >
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={twMerge(
                                        "w-full text-left px-4 py-3 text-base hover:bg-slate-50 transition-colors flex items-center justify-between",
                                        value === option.value ? "bg-primary/5 text-primary font-medium" : "text-gray-600"
                                    )}
                                >
                                    {option.label}
                                    {value === option.value && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    )
}
