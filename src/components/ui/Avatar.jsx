import { twMerge } from 'tailwind-merge'

export function Avatar({ src, alt, size = 'md', className }) {
    const sizes = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-16 h-16",
        xl: "w-24 h-24",
    }

    return (
        <div className={twMerge("relative rounded-full overflow-hidden bg-slate-100 flex-shrink-0", sizes[size], className)}>
            {src ? (
                <img src={src} alt={alt} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-muted font-bold bg-slate-200">
                    {alt?.charAt(0) || '?'}
                </div>
            )}
        </div>
    )
}
