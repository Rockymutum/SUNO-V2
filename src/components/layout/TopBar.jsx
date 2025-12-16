import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function TopBar({ onSearchClick }) {
    const location = useLocation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const { isSubscribed } = usePushNotifications()

    // Simple title logic (can be replaced by a context or hook)
    const getTitle = () => {
        if (location.pathname === '/') return 'SUNOMSI'
        if (location.pathname === '/auth') return 'SIGN IN'
        if (location.pathname.startsWith('/workers')) return 'WORKERS'
        if (location.pathname.startsWith('/messages')) return 'MESSAGES'
        if (location.pathname.startsWith('/profile')) return 'PROFILE'
        if (location.pathname.startsWith('/notifications')) return 'ALERTS'
        return 'SUNOMSI'
    }

    return (
        <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md z-50 px-5 pt-safe h-16 flex items-center justify-between">
            <div className="flex gap-4">
                {!user ? (
                    <Link to="/auth" className="text-primary text-xs font-bold hover:opacity-70 transition-opacity bg-slate-100 px-3 py-1.5 rounded-full">
                        SIGN IN
                    </Link>
                ) : (
                    <button
                        onClick={() => navigate('/notifications')}
                        className="text-primary hover:text-gray-600 transition-colors relative"
                    >
                        <Bell size={20} strokeWidth={2} />
                        {/* Red dot only if NOT subscribed (prompt) OR if we had unread count (future) */}
                        {!isSubscribed && (
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
                        )}
                    </button>
                )}
                {location.pathname === '/' && (
                    <button
                        onClick={onSearchClick}
                        className="text-primary hover:text-gray-600 transition-colors"
                    >
                        <Search size={20} strokeWidth={2} />
                    </button>
                )}
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
                <span className="text-sm font-bold tracking-widest text-primary uppercase">
                    {getTitle()}
                </span>
                {getTitle() === 'SUNOMSI' && (
                    <img src="/logo.png" alt="Logo" className="h-4 w-auto object-contain" />
                )}
            </div>

            <div className="w-8">
                {/* Placeholder for right side or just spacing */}
            </div>
        </header>
    )
}
