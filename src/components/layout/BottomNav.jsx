import { Link, useLocation } from 'react-router-dom'
import { Home, Users, MessageSquare, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BottomNav() {
    const location = useLocation()

    // Define the main navigation items
    const navItems = [
        { path: '/', name: 'Discovery', icon: Home, color: '#6366f1' },
        { path: '/workers', name: 'Workers', icon: Users, color: '#8b5cf6' },
        { path: '/messages', name: 'Messages', icon: MessageSquare, color: '#ec4899' },
        { path: '/profile/me', name: 'Profile', icon: User, color: '#f59e0b' }
    ]

    // Determine active index based on current path
    const activeIndex = navItems.findIndex(item => {
        if (item.path === '/') {
            return location.pathname === '/'
        }
        // Match exact path or sub-paths (e.g. /workers/plumbing matches /workers)
        return location.pathname.startsWith(item.path)
    })

    // If we are on a page that isn't a main tab (like /task/123), activeIndex might be -1.
    // However, for the bottom nav validation, we generally only show it on pages where it makes sense.
    // Or we just don't highlight any tab.

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="max-w-md mx-auto px-2 pb-1">
                {/* Floating Tab Container */}
                <div className="relative pointer-events-auto">

                    {/* Shadow Blob */}
                    <div className="absolute inset-x-4 top-4 bottom-0 bg-black/5 blur-xl rounded-2xl" />

                    {/* Main Navigation Bar */}
                    <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)] border border-white/60 px-1 py-1">

                        <div className="flex items-center justify-between gap-0 relative z-10">
                            {/* Active Tab Indicator - Soft Gray Pill */}
                            {activeIndex !== -1 && (
                                <motion.div
                                    className="absolute inset-y-1 bg-gray-100/80 rounded-xl"
                                    layoutId="activeTabMinimal"
                                    initial={false}
                                    animate={{
                                        left: `${activeIndex * 25}%`,
                                        width: '25%'
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30
                                    }}
                                />
                            )}

                            {navItems.map((item, index) => {
                                const isActive = activeIndex === index
                                const Icon = item.icon

                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className="relative flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 group touch-manipulation"
                                    >
                                        {/* Icon Container */}
                                        <div className="relative z-10">
                                            <Icon
                                                size={22}
                                                strokeWidth={isActive ? 2.5 : 2}
                                                className={`transition-all duration-300 ${isActive
                                                        ? 'text-black transform scale-105'
                                                        : 'text-gray-400 group-hover:text-gray-600'
                                                    }`}
                                            />
                                        </div>

                                        {/* Label */}
                                        <span className={`text-[9px] font-medium mt-0.5 transition-colors duration-300 ${isActive ? 'text-black font-bold' : 'text-gray-500'
                                            }`}>
                                            {item.name}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
