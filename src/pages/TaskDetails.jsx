import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, Share2, MapPin, Clock, ShieldCheck, Loader2, Check, User } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import OfferModal from '@/components/OfferModal'
import ReviewModal from '@/components/ReviewModal'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'

export default function TaskDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const queryClient = useQueryClient()

    const [contactLoading, setContactLoading] = useState(false)
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false)
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
    const [selectedApplicationId, setSelectedApplicationId] = useState(null)
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'success' }) // type: success | error

    const { data: { task, applications } = { task: null, applications: [] }, isLoading: loading } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            // Task Details
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select(`*, creator:users(display_name, avatar_url)`)
                .eq('id', id)
                .single()

            if (taskError) throw taskError

            // Applications
            const { data: appsData, error: appsError } = await supabase
                .from('applications')
                .select(`
                    *,
                    worker:users!worker_id(id, display_name, avatar_url, is_worker, rating)
                `)
                .eq('task_id', id)
                .order('created_at', { ascending: false })

            if (appsError) throw appsError

            return { task: taskData, applications: appsData || [] }
        },
        enabled: !!id
    })



    const openAcceptModal = (applicationId) => {
        setSelectedApplicationId(applicationId)
        setIsAcceptModalOpen(true)
    }

    const confirmAcceptOffer = async () => {
        if (!selectedApplicationId) return

        try {
            // 1. Update Application status
            const { error: appError } = await supabase
                .from('applications')
                .update({ status: 'accepted' })
                .eq('id', selectedApplicationId)

            if (appError) throw appError

            // 2. Update Task status
            const { error: taskError } = await supabase
                .from('tasks')
                .update({ status: 'in_progress' })
                .eq('id', id)

            if (taskError) throw taskError

            await queryClient.invalidateQueries({ queryKey: ['task', id] })
            setIsAcceptModalOpen(false)
            await queryClient.invalidateQueries({ queryKey: ['task', id] })
            setInfoModal({ isOpen: true, title: 'Success', message: 'Task marked as completed.', type: 'success' })
        } catch (error) {
            console.error('Error accepting offer:', error)
            setInfoModal({ isOpen: true, title: 'Error', message: 'Failed to accept offer.', type: 'error' })
        }
    }

    const openCompleteModal = () => setIsCompleteModalOpen(true)

    const confirmCompleteTask = async () => {
        try {
            // Find accepted applicant locally or fetch
            let acceptedApp = applications.find(app => app.status === 'accepted')

            if (!acceptedApp) {
                // Fallback fetch
                const { data } = await supabase.from('applications')
                    .select('worker_id')
                    .eq('task_id', id)
                    .eq('status', 'accepted')
                    .single()
                if (data) acceptedApp = data
            }

            if (!acceptedApp) {
                throw new Error("No accepted application found. Please accept an offer first.")
            }

            // 1. Update Task status
            const { error: taskError } = await supabase
                .from('tasks')
                .update({ status: 'completed' })
                .eq('id', id)

            if (taskError) throw taskError

            // 2. Increment Worker Stats (RPC)
            if (acceptedApp.worker_id) {
                const { error: rpcError } = await supabase
                    .rpc('increment_completed_jobs', { worker_uuid: acceptedApp.worker_id })

                if (rpcError) console.warn('RPC failed', rpcError)
            }

            // Refresh UI
            await queryClient.invalidateQueries({ queryKey: ['task', id] })

            // Open Review Modal
            setIsReviewModalOpen(true)
            setIsCompleteModalOpen(false)

        } catch (error) {
            console.error('Error completing task:', error)
            setInfoModal({ isOpen: true, title: 'Error', message: error.message || 'Failed to complete task.', type: 'error' })
        }
    }

    const handleContact = async () => {
        if (!user) {
            navigate('/auth')
            return
        }

        if (user.id === task.created_by) {
            setInfoModal({ isOpen: true, title: 'Oops', message: "You cannot chat with yourself.", type: 'error' })
            return
        }

        setContactLoading(true)
        try {
            const { data: existingConvs, error: fetchError } = await supabase
                .from('conversations')
                .select('id')
                .contains('participant_ids', [user.id, task.created_by])

            if (fetchError) throw fetchError

            if (existingConvs && existingConvs.length > 0) {
                navigate(`/messages/${existingConvs[0].id}`)
                return
            }

            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    participant_ids: [user.id, task.created_by],
                    created_at: new Date()
                })
                .select()
                .single()

            if (createError) throw createError

            navigate(`/messages/${newConv.id}`)
        } catch (error) {
            console.error('Error starting conversation:', error)
            setInfoModal({ isOpen: true, title: 'Error', message: 'Failed to start chat.', type: 'error' })
        } finally {
            setContactLoading(false)
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    if (!task) return <div className="h-screen flex items-center justify-center">Task not found</div>

    // Creator data fallback
    const creator = task.creator || { display_name: 'Anonymous', avatar_url: null }
    const photo = task.photos?.[0]
    const isOwner = user?.id === task.created_by

    return (
        <div className="bg-white min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] relative">


            {/* Header Image with Back Button */}
            <div className="h-72 w-full relative">
                {photo ? (
                    <img src={photo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center text-slate-300">
                        {/* Option: Add a subtle pattern or icon here if desired */}
                        <div className="text-4xl opacity-20">No Image</div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"
                >
                    <Share2 size={24} />
                </button>
            </div>

            <div className="px-5 -mt-6 relative z-10">
                <div className="bg-surface rounded-2xl shadow-xl p-6 space-y-6">
                    {/* Title & Budget */}
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-2">
                                <Badge variant="primary" className="mb-2">General</Badge>
                                {task.status === 'in_progress' && <Badge className="bg-blue-100 text-blue-700 mb-2">In Progress</Badge>}
                                {task.status === 'completed' && <Badge className="bg-green-100 text-green-700 mb-2">Completed</Badge>}
                            </div>
                            <span className="text-xl font-bold text-primary tracking-tight">₹{task.budget_min} - ₹{task.budget_max}</span>
                        </div>
                        <h1 className="text-2xl font-bold leading-tight mb-2">{task.title}</h1>
                        <div className="flex items-center text-sm text-gray-500 gap-3">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {task.location}</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="prose prose-sm text-gray-600">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2">Description</h3>
                        <p>{task.description}</p>
                    </div>

                    {/* Poster */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-3">
                            <Avatar src={creator.avatar_url} alt={creator.display_name} />
                            <div>
                                <p className="font-bold text-sm block">{creator.display_name}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <ShieldCheck size={12} className="text-green-500" />
                                    <span>Verified User</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/profile/public/${task.created_by}`)}
                        >
                            View
                        </Button>
                    </div>
                </div>

                {/* Applicants Section */}
                {applications.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-bold text-lg mb-4">Applicants ({applications.length})</h3>
                        <div className="space-y-3">
                            {applications.map(app => (
                                <div key={app.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <div onClick={() => navigate(`/worker/${app.worker_id}`)} className="cursor-pointer">
                                            <Avatar src={app.worker?.avatar_url} alt={app.worker?.display_name || 'Worker'} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4
                                                    className="font-bold text-sm hover:underline cursor-pointer"
                                                    onClick={() => navigate(`/worker/${app.worker_id}`)}
                                                >
                                                    {app.worker?.display_name || 'Unknown Worker'}
                                                </h4>
                                                {app.status === 'accepted' && (
                                                    <Badge className="bg-green-100 text-green-700 text-[10px] h-5 px-1.5">Hired</Badge>
                                                )}
                                            </div>
                                            <div className="text-sm font-bold text-primary">₹{app.offer_price}</div>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{app.message}</p>
                                        </div>
                                    </div>

                                    {isOwner && app.status === 'pending' && task.status === 'open' && (
                                        <Button
                                            size="sm"
                                            className="h-8 bg-black text-white hover:bg-gray-800"
                                            onClick={() => openAcceptModal(app.id)}
                                        >
                                            Accept
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mark Completed Action for Owner */}
            {isOwner && task.status === 'in_progress' && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] flex gap-3 z-50 max-w-md mx-auto">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200"
                        onClick={openCompleteModal}
                    >
                        <Check className="mr-2 h-4 w-4" />
                        Mark as Completed
                    </Button>
                </div>
            )}

            {/* Footer Actions */}
            {!isOwner && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] flex gap-3 z-50 max-w-md mx-auto">
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={handleContact}
                        disabled={contactLoading}
                    >
                        {contactLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Contact
                    </Button>
                    <Button
                        className="flex-[2]"
                        onClick={() => {
                            if (!user) {
                                navigate('/auth')
                                return
                            }
                            if (!profile?.is_worker) {
                                setInfoModal({
                                    isOpen: true,
                                    title: 'Worker Profile Required',
                                    message: 'You must have a **Worker Profile** to make an offer on tasks.',
                                    type: 'error'
                                })
                                return
                            }
                            setIsOfferModalOpen(true)
                        }}
                        disabled={task.status !== 'open'}
                    >
                        {task.status !== 'open' ? 'Task Closed' : 'Make Offer'}
                    </Button>
                </div>
            )}


            {/* Modals */}
            <OfferModal
                isOpen={isOfferModalOpen}
                onClose={() => setIsOfferModalOpen(false)}
                task={task}
                userId={user?.id}
                onOfferSubmitted={async () => {
                    await queryClient.invalidateQueries({ queryKey: ['task', id] })
                    setInfoModal({ isOpen: true, title: 'Success', message: 'Offer submitted!', type: 'success' })
                }}
            />

            {
                applications.find(app => app.status === 'accepted') && (
                    <ReviewModal
                        isOpen={isReviewModalOpen}
                        onClose={() => setIsReviewModalOpen(false)}
                        taskId={id}
                        workerId={applications.find(app => app.status === 'accepted')?.worker_id}
                        reviewerId={user?.id}
                        onReviewSubmitted={async () => {
                            const workerId = applications.find(app => app.status === 'accepted')?.worker_id
                            await queryClient.invalidateQueries({ queryKey: ['task', id] })
                            if (workerId) {
                                await queryClient.invalidateQueries({ queryKey: ['workerProfile', workerId] })
                            }
                            setInfoModal({ isOpen: true, title: 'Thanks!', message: 'Review submitted.', type: 'success' })
                        }}
                    />
                )
            }

            <Modal
                isOpen={isAcceptModalOpen}
                onClose={() => setIsAcceptModalOpen(false)}
                title="Accept Offer"
            >
                <div className="space-y-4">
                    <p>Are you sure you want to accept this offer?</p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setIsAcceptModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAcceptOffer}>Accept Offer</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title="Complete Task"
            >
                <div className="space-y-4">
                    <p>Mark this task as completed? This will update your stats and allow you to review the worker.</p>
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</Button>
                        <Button onClick={confirmCompleteTask}>Complete Task</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={infoModal.isOpen}
                onClose={() => setInfoModal({ ...infoModal, isOpen: false })}
                title={infoModal.title}
            >
                <div>
                    <p className={`font-medium ${infoModal.type === 'error' ? 'text-red-600' : 'text-gray-900'}`}>
                        {infoModal.message}
                    </p>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={() => setInfoModal({ ...infoModal, isOpen: false })}>OK</Button>
                    </div>
                </div>
            </Modal>
        </div >
    )
}
