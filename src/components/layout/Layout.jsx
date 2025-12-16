import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import { AnimatePresence, motion } from 'framer-motion'

export default function Layout() {
    const location = useLocation()

    // Pages that should be full screen (no top/bottom nav, no default padding)
    const isFullScreen = location.pathname.startsWith('/task/') ||
        location.pathname.startsWith('/messages/') ||
        location.pathname.startsWith('/worker/') ||
        location.pathname === '/profile/edit' ||
        location.pathname === '/welcome' ||
        location.pathname === '/auth' ||
        location.pathname.startsWith('/profile/public/')

    const showNav = !isFullScreen

    // Search visibility state shared between TopBar and Pages
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    // Automatically close search when route changes
    useEffect(() => {
        setIsSearchOpen(false)
    }, [location.pathname])

    return (
        <div className="w-full h-full bg-background text-primary font-sans flex flex-col overflow-hidden">
            {/* Background fill */}
            <div className="absolute inset-0 z-0 bg-background" />

            {showNav && <TopBar onSearchClick={() => setIsSearchOpen(true)} />}

            <main className="flex-1 relative z-10 w-full max-w-md mx-auto overflow-hidden">
                <AnimatePresence mode='wait' initial={false}>
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`h-full overflow-y-auto overflow-x-hidden bg-background no-scrollbar ${isFullScreen ? '' : 'px-5 pt-16 pb-24'
                            }`}
                    >
                        <Outlet context={{ isSearchOpen, setIsSearchOpen }} />
                    </motion.div>
                </AnimatePresence>
            </main>

            {showNav && <BottomNav />}
        </div>
    )
}
