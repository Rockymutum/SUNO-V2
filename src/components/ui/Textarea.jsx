import { forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Textarea = forwardRef(({ label, error, className, ...props }, ref) => {
    return (
        <div className="w-full space-y-1.5">
            {label && <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{label}</label>}
            <textarea
                ref={ref}
                className={twMerge(
                    "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-primary placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-colors min-h-[100px] resize-y",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
                    className
                )}
                {...props}
            />
            {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
        </div>
    )
})
