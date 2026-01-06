import { twMerge } from 'tailwind-merge'
import { useState } from 'react'

export function Avatar({ src, alt, size = 'md', className }) {
    const [imageError, setImageError] = useState(false)

    const sizes = {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-16 h-16",
        xl: "w-24 h-24",
    }

    // Show fallback if no src, image error, or src is invalid
    const showFallback = !src || imageError

    return (
        <div className={twMerge("relative rounded-full overflow-hidden bg-slate-100 flex-shrink-0", sizes[size], className)}>
            {!showFallback ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-muted font-bold bg-slate-200">
                    {alt?.charAt(0)?.toUpperCase() || '?'}
                </div>
            )}
        </div>
    )
}
