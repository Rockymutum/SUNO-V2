import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Search, X, RefreshCw } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'

import { supabase } from '@/lib/supabase'

export default function Discovery() {
    // Get search visibility control from Layout
    const { isSearchOpen, setIsSearchOpen } = useOutletContext() || { isSearchOpen: true, setIsSearchOpen: () => { } }

    const [searchTerm, setSearchTerm] = useState('')
    const queryClient = useQueryClient()

    const { data: tasks = [], isLoading: loading, error: fetchError } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            console.log("Fetching tasks for Discovery...")
            // Fix for PGRST201: Ambiguous foreign key. 
            // We specify !tasks_created_by_fkey to tell Supabase to use the 'created_by' relationship.
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    creator:users!tasks_created_by_fkey(display_name, avatar_url)
                `)
                .eq('status', 'open')
                .is('target_worker_id', null)
                .order('created_at', { ascending: false })

            if (error) {
                console.error("Supabase Error fetching tasks:", error)
                throw error
            }
            console.log("Fetched Tasks (Raw):", data)
            return data
        }
    })

    // Mutation for deleting tasks
    const deleteMutation = useMutation({
        mutationFn: async (taskId) => {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)

            if (error) throw error
            return taskId
        },
        onSuccess: (taskId) => {
            // Invalidate and refetch tasks
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        },
        onError: (error) => {
            console.error('Failed to delete task:', error)
        }
    })

    const handleDeleteTask = (taskId) => {
        deleteMutation.mutate(taskId)
    }

    // Search filter
    const filteredTasks = tasks.filter(task => {
        const term = searchTerm.toLowerCase()
        if (!term) return true

        return (
            task.title?.toLowerCase().includes(term) ||
            task.description?.toLowerCase().includes(term) ||
            task.location?.toLowerCase().includes(term) ||
            task.category?.toLowerCase().includes(term) ||
            // Check nested creator name if available
            task.creator?.display_name?.toLowerCase().includes(term)
        )
    })

    // Click outside to close search
    const searchRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                // If search is open, close it
                if (isSearchOpen) setIsSearchOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("touchstart", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("touchstart", handleClickOutside)
        }
    }, [isSearchOpen, setIsSearchOpen])

    return (
        <div className="relative min-h-full pb-20">
            {/* Create Task Floating Button */}
            <Link to="/task/create" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-40">
                <Button
                    variant="primary"
                    size="icon"
                    className="w-14 h-14 rounded-full shadow-2xl bg-primary text-white flex items-center justify-center p-0 hover:scale-105 transition-transform"
                >
                    <Plus size={28} />
                </Button>
            </Link>

            <div className="space-y-4">
                {/* Search Bar Placeholder */}
                {isSearchOpen && <div className="h-14 mb-4 transition-all duration-300" />}

                {/* Fixed Search Bar */}
                <div
                    className={`fixed top-14 left-0 right-0 z-40 w-full max-w-md mx-auto px-4 pt-0 pb-3 transition-all duration-300 ease-in-out ${isSearchOpen
                        ? 'translate-y-0 opacity-100 pointer-events-auto'
                        : '-translate-y-full opacity-0 pointer-events-none'
                        }`}
                >
                    <div ref={searchRef} className="relative">
                        <Input
                            placeholder="Search tasks..."
                            className="pl-10 bg-white shadow-xl border-gray-200"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-900"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Error State */}
                {fetchError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl m-4 text-center text-sm">
                        <p className="font-bold">Error loading tasks</p>
                        <p>{fetchError.message}</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => queryClient.invalidateQueries(['tasks'])}>
                            Retry
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="space-y-4 px-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white h-48 rounded-2xl animate-pulse shadow-sm border border-gray-100" />
                        ))}
                    </div>
                ) : (
                    /* Content State */
                    tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-gray-400">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Search size={24} className="opacity-20" />
                            </div>
                            <p className="font-medium text-gray-600">No tasks found</p>
                            <p className="text-xs mt-1 max-w-[200px]">
                                Your database might be empty, or tasks are hidden by privacy rules (RLS).
                            </p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries(['tasks'])}>
                                <RefreshCw size={14} className="mr-2" />
                                Refresh
                            </Button>
                        </div>
                    ) : (
                        filteredTasks.length > 0 ? (
                            <div className="space-y-4 px-0">
                                {filteredTasks.map(task => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <TaskCard
                                            task={task}
                                            onDelete={handleDeleteTask}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <p>No results for "{searchTerm}"</p>
                                <Button variant="link" onClick={() => setSearchTerm('')} className="text-primary">
                                    Clear search
                                </Button>
                            </div>
                        )
                    )
                )}
            </div>
        </div>
    )
}
