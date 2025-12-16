import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// VAPID Public Key (Replace with your own if you have one, or use a generated one)
// For development, we often rely on the browser's push service or a specific key.
// Supabase doesn't natively host VAPID keys, usually you need to generate them.
// For this implementation, I'll use a placeholder or check if we can use a generic one.
// Ideally, the user needs to generate VAPID keys: `npx web-push generate-vapid-keys`
// I'll assume they will set it in env var, but for now I'll use a placeholder constant.
// NOTE: Push won't work without a valid VAPID key matching the server sender.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function usePushNotifications() {
    const { user } = useAuth()
    const [permission, setPermission] = useState('default')
    const [loading, setLoading] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission)
            checkSubscription()
        }
    }, [])

    const checkSubscription = async () => {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        }
    }

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    const subscribeToPush = async () => {
        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID Public Key not found. Please set VITE_VAPID_PUBLIC_KEY.')
            alert('Push configuration missing (VAPID Key).')
            return false
        }

        setLoading(true)
        try {
            // 1. Request Permission
            const perm = await Notification.requestPermission()
            setPermission(perm)

            if (perm !== 'granted') {
                throw new Error('Permission denied')
            }

            // 2. Subscribe via SW
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })

            // 3. Save to Supabase
            if (user) {
                const { error } = await supabase
                    .from('push_subscriptions')
                    .upsert({
                        user_id: user.id,
                        endpoint: subscription.endpoint,
                        p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
                        auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))),
                        user_agent: navigator.userAgent
                    }, { onConflict: 'user_id, endpoint' })

                if (error) throw error
            }

            setIsSubscribed(true)
            return true

        } catch (error) {
            console.error('Failed to subscribe to push:', error)
            return false
        } finally {
            setLoading(false)
        }
    }

    return {
        permission,
        loading,
        isSubscribed,
        subscribeToPush,
        isSupported: 'Notification' in window && 'serviceWorker' in navigator
    }
}
