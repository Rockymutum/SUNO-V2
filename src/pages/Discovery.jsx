import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TaskCard } from '@/components/TaskCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Search, X } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'

import { supabase } from '@/lib/supabase'

export default function Discovery() {
    // Get search visibility control from Layout
    const { isSearchOpen, setIsSearchOpen } = useOutletContext() || { isSearchOpen: true, setIsSearchOpen: () => { } }

    const [searchTerm, setSearchTerm] = useState('')
    const { data: tasks = [], isLoading: loading } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    creator:users(display_name, avatar_url)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        }
    })

    // Search filter
    const filteredTasks = tasks.filter(task => {
        const term = searchTerm.toLowerCase()
        return (
            task.title?.toLowerCase().includes(term) ||
            task.description?.toLowerCase().includes(term) ||
            task.location?.toLowerCase().includes(term) ||
            task.category?.toLowerCase().includes(term) ||
            // Check nested creator name if available (searches by "Who posted this?")
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
        <div className="relative min-h-full">
            {/* Create Task Floating Button */}
            <Link to="/task/create" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-40">
                <Button
                    variant="primary"
                    size="icon"
                    className="w-14 h-14 rounded-full shadow-2xl bg-primary text-white flex items-center justify-center p-0"
                >
                    <Plus size={28} />
                </Button>
            </Link>

            <div className="space-y-4">
                {/* Search Bar Placeholder to prevent content jump - only show if search is OPEN */}
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
                    </div>
                </div>

                {loading ? (
                    <>
                        {[1, 2].map(i => (
                            <div key={i} className="bg-white h-64 rounded-xl animate-pulse shadow-sm" />
                        ))}
                    </>
                ) : (
                    filteredTasks.length > 0 ? (
                        filteredTasks.map(task => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <TaskCard
                                    task={task}
                                // onDelete logic would need mutation + invalidateQueries
                                />
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            No tasks found matching "{searchTerm}"
                        </div>
                    )
                )}
            </div>
        </div>
    )
}
