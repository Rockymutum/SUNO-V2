import { Link, useLocation } from 'react-router-dom'
import { Home, Users, MessageSquare, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'


export default function BottomNav() {
    const location = useLocation()
    const unreadCount = useUnreadMessages()


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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-200">
            {/* Safe Area Spacer for background color extension */}
            <div className="w-full max-w-md mx-auto relative pointer-events-auto">
                <div className="flex items-center justify-between px-0 pb-[env(safe-area-inset-bottom)] pt-1">

                    {/* Active Tab Indicator - Top Line or Background?
                        User asked for "no curve on edge".
                        Let's keep the soft pill but perhaps less rounded or just a flat block?
                        Standard fixed bars usually just color the icon or use a top border.
                        Let's stick to the subtle background pill for now, but square it up a bit if strictly requested,
                        or keep "rounded-xl" internal pill as it's inside the bar.
                        User said "remove curve on edge on vertical too", referring to the main container.
                    */}

                    {/* Active Tab Background Pill - Keeping slightly rounded for internal visual hierarchy,
                        but effectively making the bar itself square. */}
                    {activeIndex !== -1 && (
                        <motion.div
                            className="absolute top-1 bottom-[env(safe-area-inset-bottom)] bg-gray-100/80 rounded-lg -z-10"
                            layoutId="activeTabMinimal"
                            initial={false}
                            animate={{
                                left: `${activeIndex * 25}%`,
                                width: '25%'
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 40
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
                                className="relative flex-1 flex flex-col items-center justify-center py-2 touch-manipulation active:scale-95 transition-transform duration-100"
                            >
                                {/* Icon Container */}
                                <div className="relative inline-block">
                                    <Icon
                                        size={24}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-all duration-300 relative z-10 ${isActive
                                            ? 'text-black'
                                            : 'text-gray-400 group-hover:text-gray-600'
                                            }`}
                                    />
                                    {item.name === 'Messages' && unreadCount > 0 && (
                                        <span className="absolute -top-1.5 -right-2 z-20 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white shadow-sm">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>


                                {/* Label */}
                                <span className={`text-[10px] font-medium mt-1 transition-colors duration-300 ${isActive ? 'text-black font-bold' : 'text-gray-500'
                                    }`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
