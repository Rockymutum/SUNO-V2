import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Bell, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'

export function NotificationPermissionModal({ isOpen, onClose, onEnable, loading }) {
    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Enable Notifications"
        >
            <div className="flex flex-col items-center text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative">
                    <Bell className="w-10 h-10 text-primary" />
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                        <div className="bg-red-500 w-3 h-3 rounded-full animate-pulse" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Don't Miss Out!</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">
                        Get instant alerts for new offers, messages, and job updates—even when your screen is locked.
                    </p>
                </div>

                <div className="w-full space-y-3">
                    <Button
                        onClick={onEnable}
                        disabled={loading}
                        className="w-full bg-black text-white hover:bg-gray-900 py-6 text-lg shadow-xl shadow-black/10"
                    >
                        {loading ? 'Enabling...' : 'Enable Notifications'}
                    </Button>

                    <button
                        onClick={onClose}
                        className="text-sm text-gray-400 hover:text-gray-600 font-medium"
                    >
                        Maybe Later
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                    <ShieldCheck size={12} />
                    <span>We promise not to span you</span>
                </div>
            </div>
        </Modal>
    )
}
