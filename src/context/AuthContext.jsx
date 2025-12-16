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

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // Profile missing, try to auto-create from metadata (auto-heal)
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        const updates = {
                            id: user.id,
                            email: user.email,
                            display_name: user?.user_metadata?.full_name,
                            avatar_url: user?.user_metadata?.avatar_url,
                            updated_at: new Date()
                        }
                        const { data: newProfile, error: insertError } = await supabase
                            .from('users')
                            .upsert(updates)
                            .select()
                            .single()

                        if (!insertError) {
                            setProfile(newProfile)
                            return
                        }
                    }
                }

                // Handle JWT expiry (auto-logout to prevent infinite loop)
                if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
                    console.warn('Session expired, signing out...')
                    await supabase.auth.signOut()
                    setSession(null)
                    setUser(null)
                    setProfile(null)
                    return
                }

                console.error('Error fetching profile:', error)
            }
            setProfile(data)
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
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
