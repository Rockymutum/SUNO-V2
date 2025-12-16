import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Settings, LogOut, ChevronRight, User, Bell, Shield, Briefcase, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()
    const [isWorker, setIsWorker] = useState(false)
    const [loadingWorkerStatus, setLoadingWorkerStatus] = useState(false)
    const [postedTasksCount, setPostedTasksCount] = useState(0)

    // Sync isWorker state with profile data
    useEffect(() => {
        if (profile) {
            setIsWorker(profile.is_worker || false)
        }

        const fetchStats = async () => {
            if (!user) return
            const { count, error } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', user.id)

            if (!error) setPostedTasksCount(count || 0)
        }

        fetchStats()
    }, [profile, user])

    const handleWorkerToggle = async () => {
        if (!user) return

        const newValue = !isWorker
        setIsWorker(newValue) // Optimistic update
        setLoadingWorkerStatus(true)

        try {
            const { error } = await supabase
                .from('users')
                .update({ is_worker: newValue })
                .eq('id', user.id)

            if (error) throw error
        } catch (error) {
            console.error('Error updating worker status:', error)
            setIsWorker(!newValue) // Revert on error
        } finally {
            setLoadingWorkerStatus(false)
        }
    }

    const displayName = profile?.display_name || user?.user_metadata?.full_name || 'User'
    const email = user?.email
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

    const handleSignOut = async () => {
        await signOut()
        navigate('/welcome')
    }

    const menuItems = [
        { icon: User, label: 'Edit Profile' },
        { icon: Bell, label: 'Notifications' },
        { icon: Shield, label: 'Privacy & Security' },
    ]

    const workerMenuItems = [
        { icon: Briefcase, label: 'Worker Profile Setting' },
        { icon: Plus, label: 'My Services' },
    ]

    // Safety check to prevent crashing if user is somehow null in a protected route
    if (!user) return null

    return (
        <div className="pb-24 space-y-6">
            <div className="flex items-center gap-4 px-2">
                <Avatar src={avatarUrl} alt={displayName} size="xl" />
                <div>
                    <h1 className="text-2xl font-bold">{displayName}</h1>
                    <p className="text-sm text-muted">{email}</p>
                </div>
            </div>

            <div className="px-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <div>
                        <h3 className="font-bold text-gray-900">Worker Mode</h3>
                        <p className="text-xs text-muted">Switch to worker view to manage jobs</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isWorker}
                            onChange={handleWorkerToggle}
                            disabled={loadingWorkerStatus}
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${loadingWorkerStatus ? 'opacity-50' : ''}`}></div>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center bg-primary text-white border-none shadow-lg shadow-primary/20">
                    <div className="text-2xl font-bold">₹0</div>
                    <div className="text-[10px] opacity-80 uppercase tracking-wider">Wallet Balance</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">{postedTasksCount}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wider">Posted Tasks</div>
                </Card>
            </div>

            <Card className="divide-y divide-gray-50 border-0 shadow-sm">
                {menuItems.map((item, i) => (
                    <button
                        key={i}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                        onClick={() => {
                            if (item.label === 'Edit Profile') navigate('/profile/edit')
                            if (item.label === 'Privacy & Security') navigate('/privacy')
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg text-primary">
                                <item.icon size={18} />
                            </div>
                            <span className="font-medium text-sm">{item.label}</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </button>
                ))}
            </Card>

            {isWorker && (
                <Card className="divide-y divide-gray-50 border-0 shadow-sm">
                    <div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Worker Settings</div>
                    {workerMenuItems.map((item, i) => (
                        <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left" onClick={() => item.label === 'Worker Profile Setting' && navigate('/worker/edit')}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <item.icon size={18} />
                                </div>
                                <span className="font-medium text-sm">{item.label}</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-400" />
                        </button>
                    ))}
                </Card>
            )}

            <Button variant="secondary" className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100" onClick={handleSignOut}>
                <LogOut size={18} className="mr-2" />
                Sign Out
            </Button>
        </div>
    )
}

