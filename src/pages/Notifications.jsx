import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, Trash2, Bell, CheckCircle2, MessageSquare, Heart, Star, MessageCircle, CheckCircle, Briefcase, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { usePWA } from '@/context/PWAContext'
import { Download } from 'lucide-react'


export default function Notifications() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { isSubscribed, subscribeToPush, loading: pushLoading } = usePushNotifications()
    const { needRefresh, updateServiceWorker } = usePWA()
    const [showPushModal, setShowPushModal] = useState(false)


    // Fetch Notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!user
    })

    // Real-time subscription for new notifications
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    // Refresh list when new notification arrives
                    queryClient.invalidateQueries(['notifications', user.id])
                    // Optional: Play sound or show toast here
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, queryClient])

    // Mark all as read on mount
    useEffect(() => {
        if (notifications.some(n => !n.is_read)) {
            supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false)
                .then(() => {
                    queryClient.invalidateQueries(['notifications'])
                })
        }
    }, [notifications.length])

    const handleDelete = async (e, id) => {
        e.stopPropagation()
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)

        if (!error) {
            queryClient.setQueryData(['notifications', user?.id], old => old.filter(n => n.id !== id))
        }
    }

    const handleClearAll = async () => {
        if (!confirm('Clear all notifications?')) return
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id)

        if (!error) {
            queryClient.setQueryData(['notifications', user?.id], [])
        }
    }

    // Get icon based on notification type
    const getNotificationIcon = (notification) => {
        const title = notification.title.toLowerCase()
        const body = notification.body.toLowerCase()

        // Distinguish between REQUEST and ACCEPTED
        if (title.includes('request')) {
            return { Icon: Briefcase, color: 'bg-amber-100 text-amber-600' } // Critical Request
        }
        if (title.includes('accepted')) {
            return { Icon: CheckCircle2, color: 'bg-teal-100 text-teal-600' } // Ambient Acceptance
        }
        if (title.includes('booking')) {
            return { Icon: Briefcase, color: 'bg-blue-100 text-blue-600' } // Generic
        }
        if (title.includes('message') || body.includes('message')) {
            return { Icon: MessageSquare, color: 'bg-blue-100 text-blue-600' }
        }
        if (title.includes('comment') || body.includes('comment') || title.includes('reply')) {
            return { Icon: MessageCircle, color: 'bg-purple-100 text-purple-600' }
        }
        if (title.includes('like') || title.includes('liked')) {
            return { Icon: Heart, color: 'bg-pink-100 text-pink-600' }
        }
        if (title.includes('review')) {
            return { Icon: Star, color: 'bg-yellow-100 text-yellow-600' }
        }
        if (title.includes('offer') || title.includes('completed')) {
            return { Icon: CheckCircle, color: 'bg-green-100 text-green-600' }
        }
        return { Icon: Bell, color: 'bg-slate-100 text-slate-600' }
    }

    const handleNotificationClick = (n) => {
        if (n.data?.url) {
            navigate(n.data.url)
        }
    }

    return (
        <div className="min-h-[100dvh] bg-white pb-20">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-10 px-4 h-14 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-500 hover:bg-slate-100 rounded-full">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="font-bold text-lg">Notifications</h1>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* List */}
            <div className="pt-16 space-y-1 px-2">
                {needRefresh && (
                    <div
                        onClick={() => updateServiceWorker(true)}
                        className="mb-4 bg-black text-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-gray-900 transition-all shadow-xl shadow-black/20 mx-2"
                    >
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                            <Download size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-sm">Update Available</h3>
                            <p className="text-xs text-white/70">A new version is available. Tap to update.</p>
                        </div>
                        <Button size="sm" className="bg-white text-black hover:bg-gray-100 text-xs px-3 h-8">Update</Button>
                    </div>
                )}

                {!isSubscribed && (

                    <div
                        onClick={() => setShowPushModal(true)}
                        className="mb-6 bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors mx-2"
                    >
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-primary">
                            <Bell size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-sm">Enable Push Alerts</h3>
                            <p className="text-xs text-gray-500">Don't miss updates when you're away.</p>
                        </div>
                        <Button size="sm" className="bg-primary text-white text-xs px-3 h-8">Enable</Button>
                    </div>
                )}

                {/* DEBUG: Test Push Button */}
                {isSubscribed && user && (
                    <div className="mb-4 flex flex-col gap-2 justify-center mx-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try {
                                    alert('Sending test push...')
                                    const { data, error } = await supabase.functions.invoke('push-notification', {
                                        body: {
                                            type: 'INSERT',
                                            record: {
                                                user_id: user.id,
                                                title: 'Test Success! 🚀',
                                                body: 'Push notifications are working correctly.',
                                                data: { url: '/notifications' }
                                            }
                                        }
                                    })
                                    if (error) throw error

                                    const { sent, total, failures } = data
                                    if (sent > 0) {
                                        alert(`Sent to ${sent}/${total} devices! Check status bar.`)
                                    } else {
                                        alert(`Failed to send. Errors: ${JSON.stringify(failures)}`)
                                    }
                                } catch (e) {
                                    alert('Error: ' + e.message)
                                    console.error(e)
                                }
                            }}
                        >
                            🔔 Test Push
                        </Button>

                        <details className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <summary>Debug Info</summary>
                            <div className="mt-2 space-y-2">
                                <p><strong>Permission:</strong> {Notification.permission}</p>
                                <p><strong>SW Active:</strong> {navigator.serviceWorker?.controller ? 'Yes' : 'No'}</p>
                                <Button
                                    size="xs"
                                    variant="destructive"
                                    onClick={async () => {
                                        if (confirm('Reset Push Setup? This will unregister SW.')) {
                                            const regs = await navigator.serviceWorker.getRegistrations()
                                            for (let reg of regs) await reg.unregister()
                                            alert('Reset complete. Reloading...')
                                            window.location.reload()
                                        }
                                    }}
                                >
                                    Reset / Unregister SW
                                </Button>
                            </div>
                        </details>
                    </div>
                )}

                {isLoading ? (
                    <div className="space-y-4 pt-4 px-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 px-2">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <Bell size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-slate-900">No notifications</h3>
                            <p className="text-sm text-slate-500">You're all caught up!</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {notifications.map((n) => {
                            const { Icon, color } = getNotificationIcon(n)

                            // 1. Critical Booking REQUEST (Worker Side)
                            const isBookingRequest = n.title.toLowerCase().includes('booking') && n.title.toLowerCase().includes('request')

                            // 2. Ambient Booking ACCEPTED (Customer Side)
                            const isBookingAccepted = n.title.toLowerCase().includes('accepted') && n.title.toLowerCase().includes('booking')

                            return (
                                <motion.div
                                    key={n.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    onClick={() => handleNotificationClick(n)}
                                    // STYLE LOGIC
                                    className={`relative group p-4 transition-all cursor-pointer active:scale-[0.99] touch-manipulation
                                        ${isBookingRequest
                                            ? 'bg-amber-50/90 border border-amber-200 shadow-sm rounded-2xl my-3 mx-1 !p-5'
                                            : isBookingAccepted
                                                ? 'bg-teal-50/60 border border-teal-100 shadow-sm rounded-2xl my-3 mx-1 !p-5'
                                                : `border-b ${n.is_read ? 'bg-white border-slate-100' : 'bg-blue-50/30 border-blue-100'} hover:bg-slate-50 rounded-none`
                                        }
                                    `}
                                >
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 
                                            ${isBookingRequest
                                                ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-50 shadow-sm'
                                                : isBookingAccepted
                                                    ? 'bg-teal-100 text-teal-600 ring-4 ring-teal-50 shadow-sm'
                                                    : color}
                                        `}>
                                            <Icon size={(isBookingRequest || isBookingAccepted) ? 20 : 18} />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-8">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-sm truncate ${!n.is_read && 'text-primary'} ${(isBookingRequest || isBookingAccepted) ? '!text-slate-900 font-bold text-base' : 'font-semibold'}`}>
                                                    {n.title}
                                                </h3>
                                                {/* BADGES */}
                                                {isBookingRequest && (
                                                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                                        Critical
                                                    </span>
                                                )}
                                                {isBookingAccepted && (
                                                    <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        Confirmed
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${(isBookingRequest || isBookingAccepted) ? 'text-slate-700 font-medium' : 'text-gray-600'}`}>
                                                {n.body}
                                            </p>
                                            <span className={`text-[10px] mt-2 block ${(isBookingRequest || isBookingAccepted) ? 'text-slate-400 font-semibold' : 'text-gray-400'}`}>
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => handleDelete(e, n.id)}
                                        className="absolute right-3 top-3 p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                )}
            </div>

            <NotificationPermissionModal
                isOpen={showPushModal}
                onClose={() => setShowPushModal(false)}
                loading={pushLoading}
                onEnable={async () => {
                    const success = await subscribeToPush()
                    if (success) setShowPushModal(false)
                }}
            />
        </div >
    )
}
