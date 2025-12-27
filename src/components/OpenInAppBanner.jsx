import { useState, useEffect } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function OpenInAppBanner() {
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        // Check if running in standalone mode (PWA is installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone || // iOS
            document.referrer.includes('android-app://') // Android

        // Check if running in browser (not PWA)
        const isInBrowser = !isStandalone

        // Check if PWA is likely installed (has been visited before)
        const hasVisitedBefore = localStorage.getItem('pwa-visited')

        // Show banner only if:
        // 1. User is in browser (not PWA)
        // 2. User has visited before (likely has PWA installed)
        // 3. Banner hasn't been dismissed in this session
        const bannerDismissed = sessionStorage.getItem('app-banner-dismissed')

        if (isInBrowser && hasVisitedBefore && !bannerDismissed) {
            setShowBanner(true)
        }

        // Mark that user has visited
        if (!hasVisitedBefore) {
            localStorage.setItem('pwa-visited', 'true')
        }
    }, [])

    const handleOpenInApp = () => {
        // Try to open in PWA
        // For Android, this will trigger the app if installed
        const currentUrl = window.location.href

        // Android intent URL
        const androidIntent = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`

        // Try Android intent first
        window.location.href = androidIntent

        // Fallback: just reload (PWA should catch it if installed)
        setTimeout(() => {
            window.location.reload()
        }, 500)
    }

    const handleDismiss = () => {
        setShowBanner(false)
        sessionStorage.setItem('app-banner-dismissed', 'true')
    }

    if (!showBanner) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-white shadow-lg animate-slide-down">
            <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                    <ExternalLink size={20} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Open in SUNOMSI App</p>
                        <p className="text-xs opacity-90">Get the full experience</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleOpenInApp}
                        size="sm"
                        className="bg-white text-primary hover:bg-gray-100 font-semibold text-xs px-3 py-1.5"
                    >
                        Open
                    </Button>
                    <button
                        onClick={handleDismiss}
                        className="text-white/80 hover:text-white p-1"
                        aria-label="Dismiss"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
