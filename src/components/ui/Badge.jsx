import { twMerge } from 'tailwind-merge'

export function Badge({ children, variant = 'default', className }) {
    const variants = {
        default: "bg-slate-100 text-slate-700",
        primary: "bg-primary text-white",
        outline: "border border-slate-200 text-slate-600 bg-transparent",
        success: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-800",
    }

    return (
        <span className={twMerge("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
            {children}
        </span>
    )
}
