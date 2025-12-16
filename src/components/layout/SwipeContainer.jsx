import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Home, Users, MessageSquare, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'swiper/css'

export default function SwipeContainer({ children }) {
    const navigate = useNavigate()
    const location = useLocation()
    const swiperRef = useRef(null)
    const [activeIndex, setActiveIndex] = useState(0)

    // Define the pages in order
    const pages = [
        { path: '/', name: 'Discovery', icon: Home, color: '#6366f1' },
        { path: '/workers', name: 'Workers', icon: Users, color: '#8b5cf6' },
        { path: '/messages', name: 'Messages', icon: MessageSquare, color: '#ec4899' },
        { path: '/profile/me', name: 'Profile', icon: User, color: '#f59e0b' }
    ]

    // Find initial index based on current path
    useEffect(() => {
        const currentIndex = pages.findIndex(page => {
            if (page.path === '/') {
                return location.pathname === '/'
            }
            return location.pathname.startsWith(page.path)
        })

        if (currentIndex !== -1 && swiperRef.current) {
            swiperRef.current.slideTo(currentIndex, 0)
            setActiveIndex(currentIndex)
        }
    }, [location.pathname])

    // Handle slide change
    const handleSlideChange = (swiper) => {
        const newIndex = swiper.activeIndex
        setActiveIndex(newIndex)

        const newPath = pages[newIndex].path
        if (location.pathname !== newPath) {
            navigate(newPath, { replace: true })
        }
    }

    // Handle navigation item click
    const handleNavClick = (index) => {
        if (swiperRef.current) {
            swiperRef.current.slideTo(index)
        }
    }

    return (
        <div className="h-full w-full relative">
            <Swiper
                onSwiper={(swiper) => {
                    swiperRef.current = swiper
                }}
                onSlideChange={handleSlideChange}
                spaceBetween={0}
                slidesPerView={1}
                speed={300}
                threshold={10}
                resistance={true}
                resistanceRatio={0.5}
                className="h-full w-full"
                initialSlide={activeIndex}
            >
                {children}
            </Swiper>

            {/* Modern Floating Tab Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="max-w-md mx-auto px-6 pb-4">
                    {/* Floating Tab Container */}
                    <div className="relative pointer-events-auto">
                        {/* Background Blob */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-full blur-2xl"
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />

                        {/* Main Navigation Bar */}
                        <div className="relative bg-white/90 backdrop-blur-xl rounded-full shadow-2xl border border-gray-100/50 px-2 py-2">
                            <div className="flex items-center justify-between gap-1 relative">
                                {/* Active Tab Background - Dynamic Island Style */}
                                <motion.div
                                    className="absolute h-12 rounded-full"
                                    style={{
                                        background: `linear-gradient(135deg, ${pages[activeIndex].color}15 0%, ${pages[activeIndex].color}25 100%)`,
                                        border: `1.5px solid ${pages[activeIndex].color}40`
                                    }}
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

                                {pages.map((item, index) => {
                                    const isActive = activeIndex === index
                                    const Icon = item.icon

                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => handleNavClick(index)}
                                            className="relative flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300"
                                        >
                                            {/* Icon Container */}
                                            <motion.div
                                                className="relative"
                                                animate={{
                                                    scale: isActive ? 1.1 : 1,
                                                    y: isActive ? -2 : 0
                                                }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 20
                                                }}
                                            >
                                                {/* Glow Effect */}
                                                {isActive && (
                                                    <motion.div
                                                        className="absolute inset-0 rounded-full blur-lg"
                                                        style={{ backgroundColor: item.color }}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 0.3 }}
                                                        exit={{ opacity: 0 }}
                                                    />
                                                )}

                                                <Icon
                                                    size={20}
                                                    style={{ color: isActive ? item.color : '#9ca3af' }}
                                                    strokeWidth={isActive ? 2.5 : 2}
                                                    className="relative z-10 transition-colors duration-300"
                                                />
                                            </motion.div>

                                            {/* Label with fade animation */}
                                            <AnimatePresence mode="wait">
                                                {isActive && (
                                                    <motion.span
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -5 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-[9px] font-bold uppercase tracking-wider mt-1"
                                                        style={{ color: item.color }}
                                                    >
                                                        {item.name}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Decorative Dots */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
                            {pages.map((_, index) => (
                                <motion.div
                                    key={index}
                                    className="w-1 h-1 rounded-full"
                                    style={{
                                        backgroundColor: activeIndex === index ? pages[activeIndex].color : '#d1d5db'
                                    }}
                                    animate={{
                                        scale: activeIndex === index ? 1.5 : 1,
                                        opacity: activeIndex === index ? 1 : 0.4
                                    }}
                                    transition={{ duration: 0.3 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .swiper-slide {
                    height: 100%;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding-bottom: calc(6rem + env(safe-area-inset-bottom));
                }

                .swiper-slide::-webkit-scrollbar {
                    display: none;
                }

                .swiper-slide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}

export { SwiperSlide }
