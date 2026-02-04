import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Star, MapPin, Globe, Loader2, ChevronLeft, CalendarClock, CreditCard, X, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Modal } from '@/components/ui/Modal'

export default function WorkerProfile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const routeLocation = useLocation()
    const { user } = useAuth()

    // Booking State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [bookingLoading, setBookingLoading] = useState(false)
    const [bookingSuccess, setBookingSuccess] = useState(false)

    // Form State
    const [bookingForm, setBookingForm] = useState({
        title: '',
        description: '',
        budget: '',
        date: ''
    })

    const { data: profileData, isLoading: loading } = useQuery({
        queryKey: ['workerProfile', id],
        queryFn: async () => {
            // Fetch user profile and associated worker profile
            const { data: userData, error: userError } = await supabase
                .from('public_user_details')
                .select(`
                    *,
                    worker_profile:worker_profiles(*)
                `)
                .eq('id', id)
                .single()

            if (userError) throw userError

            // Fetch job count
            const { count: tasksPosted } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', id)

            // Fetch reviews
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select(`
                    id,
                    rating,
                    comment,
                    created_at,
                    reviewer:users!reviewer_id(display_name, avatar_url)
                `)
                .eq('worker_id', id)
                .order('created_at', { ascending: false })

            // Check if worker is currently busy (active job)
            const { data: activeJobsData } = await supabase
                .from('applications')
                .select('id, task:tasks!inner(id, title, status)')
                .eq('worker_id', id)
                .eq('status', 'accepted')
                .eq('task.status', 'in_progress')

            const activeJobsCount = activeJobsData?.length || 0

            return {
                profile: userData,
                stats: {
                    jobsPosted: tasksPosted || 0,
                    jobsDone: userData.worker_profile?.completed_jobs_count || 0,
                    rating: userData.worker_profile?.average_rating || 0,
                    reviews: userData.worker_profile?.reviews_count || 0,
                    activeJobs: activeJobsCount || 0,
                    activeJobsData: activeJobsData || []
                },
                reviews: reviewsData || []
            }
        },
        enabled: !!id
    })

    const handleBookClick = () => {
        if (!user) {
            navigate('/auth')
            return
        }
        if (user.id === id) {
            alert("You cannot book yourself.")
            return
        }
        setIsBookingModalOpen(true)
    }

    const handleBookingSubmit = async (e) => {
        e.preventDefault()
        if (!bookingForm.title || !bookingForm.budget) return

        setBookingLoading(true)
        try {
            // 1. Create Task (Targeted)
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    created_by: user.id,
                    title: bookingForm.title,
                    description: bookingForm.description,
                    budget_min: parseFloat(bookingForm.budget),
                    budget_max: parseFloat(bookingForm.budget), // Fixed price for direct booking
                    location: profileData?.profile?.location || 'Remote', // Default or user input
                    target_worker_id: id,
                    status: 'open',
                    created_at: new Date()
                })
                .select()
                .single()

            if (taskError) throw taskError

            // 2. Notify Worker
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: id,
                    title: 'New Booking Request! 📅',
                    body: `${user.user_metadata?.full_name || 'A user'} wants to book you for "${bookingForm.title}" (₹${bookingForm.budget}).`,
                    data: { url: `/task/${taskData.id}` },
                    is_read: false
                })

            // Push Notification (Optional hook)
            supabase.functions.invoke('push-notification', {
                body: {
                    type: 'INSERT',
                    record: {
                        user_id: id,
                        title: 'New Booking Request! 📅',
                        body: `New booking request: ${bookingForm.title}`,
                        data: { url: `/task/${taskData.id}` }
                    }
                }
            }).catch(console.error)

            setBookingSuccess(true)
            setIsBookingModalOpen(false)
            setBookingForm({ title: '', description: '', budget: '', date: '' })

        } catch (error) {
            console.error("Booking failed:", error)
            alert("Failed to send booking request. Please try again.")
        } finally {
            setBookingLoading(false)
        }
    }

    const profile = profileData?.profile
    const stats = profileData?.stats || { jobs: 0, rating: 0 }
    const reviews = profileData?.reviews || []

    if (loading) return <div className="h-[100dvh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    if (!profile) return <div className="h-[100dvh] flex items-center justify-center">User not found</div>

    const jobTitle = profile.job_title || 'Community Member'
    const bio = profile.bio || `Hi, I'm ${profile.display_name}.`
    const location = profile.location || 'Local'

    return (
        <div className="bg-gray-50/50 min-h-[100dvh] pb-safe">
            {/* Navigation */}
            <div className="fixed top-0 left-0 right-0 p-4 z-50 flex justify-between items-center pointer-events-none">
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-xl rounded-full text-gray-900 shadow-sm border border-gray-100 hover:bg-white transition-all active:scale-95"
                >
                    <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
            </div>

            {/* Profile Header */}
            <div className="pt-20 px-6 pb-6 bg-white rounded-b-[2rem] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-50 to-white -z-10" />

                <div className="text-center space-y-4 relative">
                    <div className="relative inline-block">
                        <Avatar
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            size="xl"
                            className="mx-auto ring-4 ring-white shadow-xl"
                        />
                        <div className="absolute -bottom-2 md:-right-2 right-0 bg-white shadow-md text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-gray-100">
                            <Star size={10} className="fill-yellow-400 text-yellow-400" />
                            {stats.rating > 0 ? stats.rating : 'New'}
                        </div>
                        {stats.activeJobs > 0 && (
                            <div className="absolute -bottom-2 -left-2 bg-red-50 text-red-600 shadow-sm text-[10px] font-bold px-2 py-1 rounded-full border border-red-100 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Busy
                            </div>
                        )}
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{profile.display_name}</h1>
                        <p className="text-gray-500 font-medium">{jobTitle}</p>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="flex justify-center items-center gap-8 pt-2">
                        <div className="text-center group cursor-default">
                            <div className="font-bold text-xl text-gray-900 group-hover:text-primary transition-colors">{stats.jobsDone}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Jobs Done</div>
                        </div>
                        <div className="w-px h-8 bg-gray-100" />
                        <div className="text-center group cursor-default">
                            <div className="font-bold text-xl text-gray-900 group-hover:text-primary transition-colors">{stats.jobsPosted}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Posted</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-6 space-y-8 max-w-lg mx-auto">
                {/* Professional Details Card */}
                <div className="grid grid-cols-2 gap-3">
                    {profile.hourly_rate && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                            <span className="text-gray-400 mb-1"><Globe size={18} /></span>
                            <span className="font-bold text-gray-900">₹{profile.hourly_rate}<span className="text-xs font-normal text-gray-400">/{profile.rate_unit === 'day' ? 'day' : 'hr'}</span></span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Rate</span>
                        </div>
                    )}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                        <span className="text-gray-400 mb-1"><MapPin size={18} /></span>
                        <span className="font-bold text-gray-900 truncate max-w-full px-2">{location}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Location</span>
                    </div>
                </div>

                {/* About Section */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">About</h3>
                        {profile.category && (
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize bg-blue-50 text-blue-700 border-blue-100">
                                {profile.category.replace('_', ' ')}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        {bio}
                    </p>
                </section>

                {/* Skills */}
                {profile.skills && profile.skills.length > 0 && (
                    <section>
                        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:border-gray-300 transition-colors"
                                >
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </section>
                )}

                {/* Portfolio / Past Work */}
                {profile.portfolio_photos && profile.portfolio_photos.length > 0 && (
                    <section>
                        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider mb-3">Portfolio</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {profile.portfolio_photos.map((url, i) => (
                                <div key={i} className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                                    <img
                                        src={url}
                                        alt={`Portfolio ${i + 1}`}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Reviews Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Reviews ({reviews.length})</h3>
                        {stats.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg">
                                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                <span>{Number(stats.rating).toFixed(1)}</span>
                            </div>
                        )}
                    </div>

                    {reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar src={review.reviewer?.avatar_url} alt={review.reviewer?.display_name || 'User'} size="sm" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{review.reviewer?.display_name || 'Anonymous'}</p>
                                                <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={12}
                                                    className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-100 text-gray-200"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {review.comment && (
                                        <p className="text-sm text-gray-600 leading-relaxed mt-2">{review.comment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-400 text-sm">No reviews yet. Be the first!</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Fixed Action Bar - Hidden if navigating from Booked Task */}
            {new URLSearchParams(routeLocation.search).get('hide_book') !== 'true' && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] flex gap-3 z-50 max-w-md mx-auto">
                    <Button
                        className={`w-full h-14 text-base font-bold shadow-xl shadow-gray-200 rounded-2xl flex items-center justify-center gap-2 ${stats.activeJobs > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-primary text-white hover:bg-primary/90'}`}
                        onClick={stats.activeJobs > 0 ? undefined : handleBookClick}
                        disabled={stats.activeJobs > 0}
                    >
                        {stats.activeJobs > 0 ? <Loader2 className="animate-spin" /> : <CalendarClock />}
                        {stats.activeJobs > 0
                            ? `Busy: ${stats.activeJobsData?.[0]?.task?.title?.slice(0, 15)}${stats.activeJobsData?.[0]?.task?.title?.length > 15 ? '...' : ''}`
                            : "Book Now"}
                    </Button>
                </div>
            )}

            <div className="h-24" />

            {/* Booking Modal */}
            <Modal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} title="Book Worker">
                <form onSubmit={handleBookingSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Task Title</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Broken Tap Repair"
                            className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black transition-all outline-none font-medium"
                            value={bookingForm.title}
                            onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                        <textarea
                            placeholder="Describe what needs to be done..."
                            className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black transition-all outline-none resize-none h-24 font-medium"
                            value={bookingForm.description}
                            onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Your Budget (₹)</label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type="number"
                                placeholder="500"
                                className="w-full p-3 pl-10 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black transition-all outline-none font-medium"
                                value={bookingForm.budget}
                                onChange={(e) => setBookingForm({ ...bookingForm, budget: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button className="w-full h-12 mt-4 text-base" disabled={bookingLoading}>
                        {bookingLoading ? <Loader2 className="animate-spin" /> : "Send Booking Request"}
                    </Button>
                </form>
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={bookingSuccess} onClose={() => setBookingSuccess(false)} title="Request Sent! 🎉">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <CalendarClock size={32} />
                    </div>
                    <p className="text-gray-600">
                        Your booking request has been sent to <strong>{profile.display_name}</strong>.
                        They will review it and accept shortly.
                    </p>
                    <Button onClick={() => setBookingSuccess(false)} className="w-full">
                        Done
                    </Button>
                </div>
            </Modal>

        </div>
    )
}
