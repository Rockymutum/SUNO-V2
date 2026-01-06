import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null)
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else setProfile(null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId, retryCount = 0) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                // Handle Generic Errors (JWT expired, etc)
                if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
                    console.warn('Session expired, signing out...')
                    await supabase.auth.signOut()
                    setSession(null)
                    setUser(null)
                    setProfile(null)
                    return
                }

                // If Profile Not Found and we haven't exhausted retries
                if (error.code === 'PGRST116') {
                    if (retryCount < 3) {
                        console.log(`Profile not found yet. Retrying in 1s... (${retryCount + 1}/3)`)
                        setTimeout(() => {
                            fetchProfile(userId, retryCount + 1)
                        }, 1000)
                        return
                    } else {
                        console.error('Profile Creation Failed: Server trigger did not create profile in time.')
                        // Optional: Show a UI toast here
                    }
                } else {
                    console.error('Error fetching profile:', error)
                }
            }

            if (data) {
                setProfile(data)
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error)
        }
    }

    const value = {
        session,
        user,
        profile,
        loading,
        signInWithGoogle: () => supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        }),
        signOut: () => supabase.auth.signOut(),
        refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve(),
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
