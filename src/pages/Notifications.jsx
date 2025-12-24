import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, Trash2, Bell, CheckCircle2 } from 'lucide-react'
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
            <div className="pt-16 px-4 space-y-2">
                {needRefresh && (
                    <div
                        onClick={() => updateServiceWorker(true)}
                        className="mb-4 bg-black text-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-gray-900 transition-all shadow-xl shadow-black/20"
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
                        className="mb-6 bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors"
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
                    <div className="mb-4 flex flex-col gap-2 justify-center">
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
                                    alert('Sent! Check status bar.')
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
                    <div className="space-y-4 pt-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
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
                        {notifications.map((n) => (
                            <motion.div
                                key={n.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                onClick={() => handleNotificationClick(n)}
                                className={`relative group p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] touch-manipulation
                                    ${n.is_read ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-100'}
                                    hover:shadow-md hover:border-slate-200
                                `}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 
                                        ${n.title.includes('Review') ? 'bg-yellow-100 text-yellow-600' :
                                            n.title.includes('Offer') ? 'bg-green-100 text-green-600' :
                                                'bg-blue-100 text-blue-600'}
                                    `}>
                                        <Bell size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h3 className={`font-semibold text-sm truncate ${!n.is_read && 'text-primary'}`}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                                            {n.body}
                                        </p>
                                    </div>
                                </div>

                                {/* Delete Button - Visible on hover/swipe (Desktop hover, mobile relies on tap target) */}
                                <button
                                    onClick={(e) => handleDelete(e, n.id)}
                                    className="absolute -top-1 -right-1 p-2 bg-white rounded-full shadow-sm border border-slate-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:scale-110"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))}
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
        </div>
    )
}
