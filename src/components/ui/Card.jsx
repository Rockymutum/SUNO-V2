import { twMerge } from 'tailwind-merge'

export function Card({ children, className, ...props }) {
    return (
        <div
            className={twMerge("bg-surface rounded-xl shadow-sm border border-slate-100/50 overflow-hidden", className)}
            {...props}
        >
            {children}
        </div>
    )
}
