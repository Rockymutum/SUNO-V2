import { createContext, useContext, useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const PWAContext = createContext()

export function PWAProvider({ children }) {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
        offlineReady: [offlineReady, setOfflineReady],
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    // Optional: Trigger a browser notification when update is available
    useEffect(() => {
        if (needRefresh) {
            if (Notification.permission === 'granted') {
                new Notification('App Update Available', {
                    body: 'A new version of the app is available. Check the Notifications tab to update.',
                    icon: '/pwa-192x192.png'
                })
            }
        }
    }, [needRefresh])

    return (
        <PWAContext.Provider
            value={{
                needRefresh,
                offlineReady,
                updateServiceWorker,
            }}
        >
            {children}
        </PWAContext.Provider>
    )
}

export const usePWA = () => {
    const context = useContext(PWAContext)
    if (context === undefined) {
        throw new Error('usePWA must be used within a PWAProvider')
    }
    return context
}
