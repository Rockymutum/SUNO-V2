import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function usePresence(userId) {
    useEffect(() => {
        if (!userId) return

        // Function to update last_seen
        const updatePresence = async () => {
            await supabase
                .from('users')
                .update({ last_seen: new Date() })
                .eq('id', userId)
        }

        // Initial update
        updatePresence()

        // Interval update (every 2 minutes)
        const interval = setInterval(updatePresence, 2 * 60 * 1000)

        // Cleanup on unmount (optional: set offline or just stop updating)
        // We just stop heartbeat
        return () => clearInterval(interval)
    }, [userId])
}
