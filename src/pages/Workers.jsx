import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { WorkerCard } from '@/components/WorkerCard'
import { Input } from '@/components/ui/Input'
import { Search, Wrench, Zap, Truck, Paintbrush, ArrowRight, Home, Loader2, Bug, HeartHandshake, Car, ChefHat, Sprout, Laptop, Briefcase } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/constants'



export default function Workers() {
    const { category } = useParams()
    const [searchTerm, setSearchTerm] = useState('')
    const { data: workers = [], isLoading: loading } = useQuery({
        queryKey: ['workers', category],
        queryFn: async () => {
            // Fetch users who are workers, plus their profile stats
            let query = supabase
                .from('users')
                .select(`
                    *,
                    worker_profile:worker_profiles(average_rating, reviews_count)
                `)
                .eq('is_worker', true)
                .neq('vacation_mode', true) // Filter out vacation mode (assume null/false is active)

            if (category && category !== 'all') {
                query = query.eq('category', category)
            }

            const { data, error } = await query

            if (error) throw error

            // Sort by rating desc
            return (data || []).sort((a, b) => {
                const ratingA = a.worker_profile?.average_rating || 0
                const ratingB = b.worker_profile?.average_rating || 0
                return ratingB - ratingA
            })
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const filteredWorkers = workers.filter(worker => {
        const term = searchTerm.toLowerCase()
        return (
            worker.display_name?.toLowerCase().includes(term) ||
            worker.job_title?.toLowerCase().includes(term) ||
            worker.category?.toLowerCase().includes(term) ||
            worker.location?.toLowerCase().includes(term) ||
            worker.bio?.toLowerCase().includes(term) ||
            (worker.skills && worker.skills.some(skill => skill.toLowerCase().includes(term)))
        )
    })

    // Show only top 3 for "Top Rated" (default view), otherwise show all matches
    const displayWorkers = (!category && !searchTerm) ? filteredWorkers.slice(0, 3) : filteredWorkers

    return (
        <div className="pb-10 space-y-6">
            <div className="relative">
                <Input
                    placeholder="Search workers..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>

            {!category && !searchTerm && (
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Categories</h2>
                        <Link to="/workers/all" className="text-xs text-primary font-medium flex items-center">View All <ArrowRight size={12} className="ml-1" /></Link>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {CATEGORIES.map(cat => (
                            <Link key={cat.id} to={`/workers/${cat.id}`} className="flex flex-col items-center gap-2">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cat.color} mb-1`}>
                                    <cat.icon size={24} />
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight">{cat.name}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 px-1">
                    {category && category !== 'all' ? `${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')} Professionals` : 'Top Rated Workers'}
                </h2>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : displayWorkers.length > 0 ? (
                    <div className="grid gap-3">
                        {displayWorkers.map(worker => (
                            <WorkerCard key={worker.id} worker={{
                                id: worker.id,
                                name: worker.display_name || 'Unknown User',
                                title: worker.job_title || 'Worker',
                                // Use real stats from worker_profile
                                rating: worker.worker_profile?.average_rating || 0,
                                reviews_count: worker.worker_profile?.reviews_count || 0,
                                rate: worker.hourly_rate || 0,
                                location: worker.location || 'Remote',
                                avatar: worker.avatar_url,
                                skills: worker.skills || []
                            }} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        No workers found {category && category !== 'all' ? `in ${category}` : ''}.
                    </div>
                )}
            </section>
        </div>
    )
}
