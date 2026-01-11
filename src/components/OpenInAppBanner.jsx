import { useState, useEffect } from 'react'
import { X, Smartphone, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'

export function OpenInAppBanner() {
    const [installPrompt, setInstallPrompt] = useState(null)
    const [showBanner, setShowBanner] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ||
            document.referrer.includes('android-app://')

        setIsInstalled(isStandalone)

        if (isStandalone) return

        // Capture the install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault()
            setInstallPrompt(e)

            // Show banner if not dismissed recently
            const isDismissed = sessionStorage.getItem('pwa-banner-dismissed')
            if (!isDismissed) {
                setShowBanner(true)
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Cleanup
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [])

    const handleInstallClick = async () => {
        if (!installPrompt) return

        // Show the native prompt
        installPrompt.prompt()

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt')
            setShowBanner(false)
        } else {
            console.log('User dismissed the install prompt')
        }

        setInstallPrompt(null)
    }

    const handleDismiss = () => {
        setShowBanner(false)
        sessionStorage.setItem('pwa-banner-dismissed', 'true')
    }

    // Don't render if installed or no prompt available (unless we want to show a manual instruction, but for now we focus on the prompt)
    // Note: On some browsers/dev environments the prompt might fire late, so we wait for it.
    if (isInstalled || !showBanner || !installPrompt) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 z-50 flex items-end justify-center pointer-events-none"
            >
                <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl shadow-black/10 rounded-2xl p-4 w-full max-w-sm pointer-events-auto overflow-hidden relative">
                    {/* Glass Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent pointer-events-none" />

                    <div className="relative flex items-center justify-between gap-4">
                        <div className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 text-white p-3 rounded-xl shadow-lg">
                            <Smartphone size={24} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm leading-tight">Install Sunomsi</h3>
                            <p className="text-xs text-muted mt-0.5">Add to home screen for the best experience</p>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="absolute -top-1 -right-1 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Button
                            onClick={handleInstallClick}
                            className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Install App
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
