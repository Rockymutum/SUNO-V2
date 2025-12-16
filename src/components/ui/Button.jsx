import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    isLoading,
    disabled,
    ...props
}) {
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]"

    const variants = {
        primary: "bg-primary text-white hover:bg-zinc-800 focus:ring-primary shadow-lg shadow-zinc-900/10",
        secondary: "bg-white border-2 border-slate-100 text-primary hover:bg-slate-50 focus:ring-slate-200",
        ghost: "bg-transparent text-muted hover:bg-slate-100/50 hover:text-primary",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    }

    const sizes = {
        sm: "px-3 py-1.5 text-xs tracking-wide",
        md: "px-5 py-3 text-sm tracking-wide",
        lg: "px-6 py-4 text-base tracking-wide w-full",
        icon: "p-2",
    }

    return (
        <motion.button
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            className={twMerge(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
        </motion.button>
    )
}
