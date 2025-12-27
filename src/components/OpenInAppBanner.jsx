import { useState, useEffect } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function OpenInAppBanner() {
    const [showBanner, setShowBanner] = useState(false)
    const [isAndroid, setIsAndroid] = useState(false)

    useEffect(() => {
        // Detect platform
        const userAgent = navigator.userAgent.toLowerCase()
        const androidDetected = /android/.test(userAgent)
        const iosDetected = /iphone|ipad|ipod/.test(userAgent)
        setIsAndroid(androidDetected)

        // Check if running in standalone mode (PWA is installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone || // iOS
            document.referrer.includes('android-app://') // Android

        // Check if running in browser (not PWA)
        const isInBrowser = !isStandalone

        // Check if PWA is likely installed (has been visited before)
        const hasVisitedBefore = localStorage.getItem('pwa-visited')

        // Check if banner hasn't been dismissed in this session
        const bannerDismissed = sessionStorage.getItem('app-banner-dismissed')

        // For iOS: Don't show custom banner - it doesn't work on iOS
        // iOS doesn't allow web pages to open PWAs programmatically
        // For Android: Try automatic redirect first
        if (androidDetected && isInBrowser && hasVisitedBefore && !bannerDismissed) {
            // Try to open in PWA automatically using Chrome's intent
            tryOpenInPWA()

            // If redirect fails, show banner after a short delay
            setTimeout(() => {
                // Check if still on page (redirect didn't work)
                if (document.visibilityState === 'visible') {
                    setShowBanner(true)
                }
            }, 1000)
        } else if (!iosDetected && isInBrowser && hasVisitedBefore && !bannerDismissed) {
            // For other browsers (not iOS, not Android), show the banner
            setShowBanner(true)
        }

        // Mark that user has visited
        if (!hasVisitedBefore) {
            localStorage.setItem('pwa-visited', 'true')
        }
    }, [])

    const tryOpenInPWA = () => {
        // For Android Chrome, use intent URL to open PWA
        if (isAndroid) {
            const currentPath = window.location.pathname + window.location.search + window.location.hash
            const host = window.location.host

            // Chrome intent URL - this will open the PWA if installed
            const intentUrl = `intent://${host}${currentPath}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`

            // Try to redirect
            window.location.href = intentUrl
        }
    }

    const handleOpenInApp = () => {
        if (isAndroid) {
            // For Android, try intent URL
            tryOpenInPWA()
        } else {
            // For iOS and others, simple reload (browser will open PWA if installed)
            window.location.href = window.location.href
        }
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
