import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Loader2, Calendar, MapPin, Briefcase, ChevronLeft, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function PublicProfile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [stats, setStats] = useState({ tasksPosted: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Fetch user profile
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('display_name, avatar_url, bio, created_at, location, phone')
                    .eq('id', id)
                    .single()

                if (userError) throw userError

                // Fetch total tasks posted by this user
                const { count, error: countError } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .eq('created_by', id)

                if (countError) throw countError

                setProfile(userData)
                setStats({ tasksPosted: count || 0 })

            } catch (error) {
                console.error('Error fetching public profile:', error)
            } finally {
                setLoading(false)
            }
        }

        if (id) fetchProfile()
    }, [id])

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    if (!profile) return <div className="h-screen flex items-center justify-center">User not found</div>

    const joinedDate = new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const bio = profile.bio || `Hi, I'm ${profile.display_name}.`
    const location = profile.location || 'Unknown Location'

    return (
        <div className="pb-24 relative bg-gray-50 min-h-screen">
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-primary hover:bg-white shadow-sm z-10 border border-slate-100"
            >
                <ChevronLeft size={24} />
            </button>

            {/* Profile Header Card */}
            <div className="bg-white rounded-b-3xl shadow-sm p-6 pt-20 text-center space-y-4 pb-10">
                <Avatar src={profile.avatar_url} alt={profile.display_name} size="xl" className="mx-auto border-4 border-white shadow-lg" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile.display_name}</h1>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar size={14} />
                        <span>Joined {joinedDate}</span>
                    </div>
                </div>

                {/* Simple Stats */}
                <div className="flex justify-center gap-8 py-4 border-t border-gray-100 mt-4">
                    <div className="text-center">
                        <div className="font-bold text-xl text-primary">{stats.tasksPosted}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tasks Posted</div>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div className="px-6 mt-6 space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-2">
                        <Briefcase size={16} className="text-primary" /> About
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {bio}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin size={16} className="text-primary" /> Location
                        </h3>
                        <p className="text-sm text-gray-600">
                            {location}
                        </p>
                    </div>

                    {profile.phone && (
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-2">
                                <Phone size={16} className="text-primary" /> Contact
                            </h3>
                            <p className="text-sm text-gray-600">
                                {profile.phone}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
