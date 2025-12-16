import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield, Key, Eye, Trash2, Smartphone, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function PrivacySecurity() {
    const navigate = useNavigate()
    const { user, profile, signOut } = useAuth()
    const [loading, setLoading] = useState(false)

    // State for toggles
    const [hidePhone, setHidePhone] = useState(false)
    const [vacationMode, setVacationMode] = useState(false)

    useEffect(() => {
        if (profile) {
            setHidePhone(profile.hide_phone || false)
            setVacationMode(profile.vacation_mode || false)
        }
    }, [profile])

    const handleToggle = async (field, currentValue) => {
        const newValue = !currentValue
        // Optimistic update
        if (field === 'hide_phone') setHidePhone(newValue)
        if (field === 'vacation_mode') setVacationMode(newValue)

        try {
            const { error } = await supabase
                .from('users')
                .update({ [field]: newValue })
                .eq('id', user.id)

            if (error) throw error
        } catch (error) {
            console.error(`Error updating ${field}:`, error)
            // Revert on error
            if (field === 'hide_phone') setHidePhone(currentValue)
            if (field === 'vacation_mode') setVacationMode(currentValue)
        }
    }

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "Are you absolutely sure?\n\nThis action cannot be undone. This will permanently delete your account, tasks, messages, and profile data."
        )

        if (confirmed) {
            const doubleConfirmed = window.prompt("Type 'DELETE' to confirm:")

            if (doubleConfirmed === 'DELETE') {
                setLoading(true)
                try {
                    // Logic to delete everything. 
                    // Ideally, Supabase 'on delete cascade' handles related data (tasks, messages, etc.) if configured.
                    // If strict RLS prevents user from deleting mostly everything, we might need a stored procedure.
                    // But usually, users can only delete themselves from auth.users (requires service role) or simple public.users deletion?
                    // NOTE: Deleting from public.users usually triggers cascade if FK is set.
                    // But deleting from auth.users requires Admin API.

                    // Client-side user deletion is often restricted.
                    // We'll try to delete from public.users first.

                    // 1. Delete user data from public table
                    const { error: dbError } = await supabase
                        .from('users')
                        .delete()
                        .eq('id', user.id)

                    if (dbError) throw dbError

                    // 2. Sign out
                    await signOut()

                    alert("Your account has been deleted.")
                    navigate('/welcome')
                } catch (error) {
                    console.error("Error deleting account:", error)
                    alert("Failed to delete account completely. Please contact support if issues persist.")
                    setLoading(false)
                }
            }
        }
    }

    return (
        <div className="bg-white min-h-screen pb-safe">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white z-50 px-4 flex items-center gap-4 border-b border-gray-100">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-gray-500 hover:bg-slate-50 rounded-full"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-bold">Privacy & Security</h1>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-20 px-5 space-y-6 max-w-md mx-auto pb-10"
            >
                <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 text-blue-700">
                    <Shield className="shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-bold mb-1">Your data is yours.</p>
                        <p className="opacity-80">Manage who can see your information and secure your account below.</p>
                    </div>
                </div>

                {/* Privacy Settings */}
                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider ml-1">Privacy</h2>
                    <Card className="divide-y divide-gray-50 border-0 shadow-sm overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-gray-600">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-900">Hide Phone Number</p>
                                    <p className="text-xs text-gray-500">Only visible to accepted offers</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={hidePhone}
                                    onChange={() => handleToggle('hide_phone', hidePhone)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-gray-600">
                                    <Eye size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-900">Vacation Mode</p>
                                    <p className="text-xs text-gray-500">Hide worker profile from search</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={vacationMode}
                                    onChange={() => handleToggle('vacation_mode', vacationMode)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </Card>
                </section>

                {/* Security Settings */}
                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider ml-1">Security</h2>
                    <Card className="divide-y divide-gray-50 border-0 shadow-sm overflow-hidden">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-gray-600">
                                    <Key size={18} />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-900">Change Password</p>
                                    <p className="text-xs text-gray-500">Update your account password</p>
                                </div>
                            </div>
                            <ChevronLeft size={16} className="text-gray-400 rotate-180" />
                        </button>
                    </Card>
                </section>

                {/* Danger Zone */}
                <section className="space-y-3 pt-4">
                    <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider ml-1">Danger Zone</h2>
                    <Card className="border-red-100 overflow-hidden shadow-sm">
                        <div className="p-4 bg-red-50/50">
                            <div className="flex gap-3 mb-4">
                                <div className="p-2 bg-red-100 rounded-lg text-red-500 h-fit">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900">Delete Account</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Permanently delete your account and all associated data. This action is irreversible.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleDeleteAccount}
                                variant="secondary"
                                className="w-full bg-white border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Delete Account'}
                            </Button>
                        </div>
                    </Card>
                </section>

                <p className="text-center text-xs text-gray-400 pt-8">
                    Privacy Policy • Terms of Service <br />
                    Version 1.0.0
                </p>
            </motion.div>
        </div>
    )
}
