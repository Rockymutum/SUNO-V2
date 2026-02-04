import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ChevronLeft, Share2, MapPin, Clock, ShieldCheck, Loader2, Check, Phone, Wallet, AlertTriangle, Briefcase } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import ReviewModal from '@/components/ReviewModal'
import { Modal } from '@/components/ui/Modal'
import { CATEGORIES } from '@/lib/constants'

export default function TaskDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const queryClient = useQueryClient()

    const [contactLoading, setContactLoading] = useState(false)
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false)
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'success' }) // type: success | error

    // Fetch Task & Applications
    const { data: { task, applications, creatorContact } = { task: null, applications: [], creatorContact: null }, isLoading: loading } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            // Task Details
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select(`*, creator:users!created_by(display_name, avatar_url, phone, location)`)
                .eq('id', id)
                .single()

            if (taskError) throw taskError

            // Applications
            const { data: appsData, error: appsError } = await supabase
                .from('applications')
                .select(`
                    *,
                    worker:users!worker_id(id, display_name, avatar_url, is_worker, rating, phone, location)
                `)
                .eq('task_id', id)
                .order('created_at', { ascending: false })

            if (appsError) throw appsError

            return { task: taskData, applications: appsData || [], creatorContact: taskData.creator }
        },
        enabled: !!id
    })

    // Fetch Current Worker Wallet (if user is worker)
    const { data: workerWallet } = useQuery({
        queryKey: ['workerWallet', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('wallet_balance, min_credit_limit')
                .eq('id', user.id)
                .single()
            if (error) throw error
            return data
        },
        enabled: !!user && !!profile?.is_worker
    })

    const isOwner = user?.id === task?.created_by
    const myApplication = applications?.find(app => app.worker_id === user?.id)
    const isHired = myApplication?.status === 'accepted'

    // Calculate Commission (10% or min 10)
    const commission = task ? Math.max(task.budget_min * 0.10, 10) : 0
    const hasSufficientBalance = workerWallet ? (workerWallet.wallet_balance - commission) >= workerWallet.min_credit_limit : false

    const handleUnlockContact = async () => {
        if (!hasSufficientBalance) {
            setInfoModal({
                isOpen: true,
                title: 'Insufficient Balance',
                message: `You need at least ₹${commission} to accept this job. Please recharge your wallet.`,
                type: 'error'
            })
            return
        }

        setContactLoading(true)
        try {
            // UPDATED: Using correct parameter names for SQL function
            const { data, error } = await supabase.rpc('handle_job_acceptance', {
                p_task_id: id,
                p_worker_id: user.id
            })

            if (error) throw error

            if (data.success) {
                await queryClient.invalidateQueries({ queryKey: ['task', id] })
                await queryClient.invalidateQueries({ queryKey: ['workerWallet', user.id] })
                setInfoModal({ isOpen: true, title: 'Success', message: 'Contact unlocked! You can now call the customer.', type: 'success' })
                setIsUnlockModalOpen(false)
            }
        } catch (error) {
            console.error('Error unlocking contact:', error)
            setInfoModal({ isOpen: true, title: 'Error', message: error.message || 'Failed to unlock contact.', type: 'error' })
        } finally {
            setContactLoading(false)
        }
    }

    const openCompleteModal = () => setIsCompleteModalOpen(true)

    const confirmCompleteTask = async () => {
        try {
            // Find accepted applicant locally or fetch
            let acceptedApp = applications.find(app => app.status === 'accepted')

            if (!acceptedApp) {
                throw new Error("No accepted application found.")
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

            // Notify Worker
            if (acceptedApp && acceptedApp.worker_id) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: acceptedApp.worker_id,
                        title: 'Task Completed ✅',
                        body: `The task "${task.title}" has been marked as completed.`,
                        data: { url: `/task/${task.id}` },
                        is_read: false
                    })
            }

            // Refresh UI
            await queryClient.invalidateQueries({ queryKey: ['task', id] })
            if (acceptedApp?.worker_id) {
                await queryClient.invalidateQueries({ queryKey: ['workerProfile', acceptedApp.worker_id] })
            }

            // Open Review Modal
            setIsReviewModalOpen(true)
            setIsCompleteModalOpen(false)

        } catch (error) {
            console.error('Error completing task:', error)
            setInfoModal({ isOpen: true, title: 'Error', message: error.message || 'Failed to complete task.', type: 'error' })
        }
    }


    if (loading) return <div className="h-[100dvh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
    if (!task) return <div className="h-[100dvh] flex items-center justify-center">Task not found</div>

    // Creator data fallback
    const creator = task.creator || { display_name: 'Anonymous', avatar_url: null }
    const photo = task.photos?.[0]
    const category = CATEGORIES.find(c => c.id === task.category)

    return (
        <div className="bg-white min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))] relative">

            {/* Header Image with Back Button */}
            <div className="h-72 w-full relative">
                {photo ? (
                    <img src={photo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center text-slate-300">
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
                            <div className="flex flex-wrap gap-2">
                                {category ? (
                                    <Badge className={`${category.color} border-0 mb-2`}>
                                        {category.name}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="mb-2">General</Badge>
                                )}

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

                    {/* Contact Info Block - Dynamic Render */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {(() => {
                            const acceptedApp = applications?.find(app => app.status === 'accepted')
                            const showWorkerToOwner = isOwner && acceptedApp
                            const showCustomerToWorker = isHired

                            // Determine display logic
                            const targetContact = showWorkerToOwner
                                ? acceptedApp.worker
                                : creator

                            const label = showWorkerToOwner
                                ? 'Assigned Worker'
                                : 'Customer Contact'

                            const isRevealed = showWorkerToOwner || showCustomerToWorker

                            return (
                                <>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">{label}</h3>

                                    {isRevealed ? (
                                        <div className="space-y-2">
                                            {/* Name (Only if it's the worker being shown) */}
                                            {showWorkerToOwner && (
                                                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm mb-1 pb-1 border-b border-gray-100">
                                                    <Briefcase size={14} className="text-amber-600" />
                                                    <span>{targetContact?.display_name || 'Worker'}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-gray-800 font-medium">
                                                <Phone size={16} className="text-green-600" />
                                                <span>{targetContact?.phone || 'No phone provided'}</span>
                                                <a href={`tel:${targetContact?.phone}`} className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">
                                                    Call Now
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <MapPin size={16} className="text-blue-600" />
                                                <span>{targetContact?.location || 'Location shared'}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 select-none filter blur-[4px] opacity-60">
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <Phone size={16} />
                                                <span>+91 98XXXXXX21</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <MapPin size={16} />
                                                <span>Sector 42, Gurgaon, Haryana</span>
                                            </div>
                                        </div>
                                    )}

                                    {!isRevealed && !isOwner && (
                                        <div className="mt-2 text-xs text-center text-gray-500 italic">
                                            Accept to unlock contact details
                                        </div>
                                    )}
                                    {!isRevealed && isOwner && task.status === 'open' && (
                                        <div className="mt-2 text-xs text-center text-gray-500 italic">
                                            Wait for a worker to accept
                                        </div>
                                    )}
                                </>
                            )
                        })()}
                    </div>

                    {/* Description */}
                    <div className="prose prose-sm text-gray-600">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-2">Description</h3>
                        <p>{task.description}</p>
                    </div>

                    {/* Footer Profile (Poster or Assigned Worker) */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        {(() => {
                            // Logic: If I am owner and task has accepted worker, show Worker here. 
                            // Otherwise show Creator (standard behavior).
                            const acceptedApp = applications?.find(app => app.status === 'accepted')
                            const showWorkerToOwner = isOwner && acceptedApp

                            const targetProfile = showWorkerToOwner ? acceptedApp.worker : creator
                            const label = showWorkerToOwner ? 'Assigned Worker' : 'Posted by' // Optional label usage

                            return (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Avatar src={targetProfile?.avatar_url} alt={targetProfile?.display_name || 'User'} />
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
                                            <p className="font-bold text-sm block">{targetProfile?.display_name || 'Unknown User'}</p>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <ShieldCheck size={12} className="text-green-500" />
                                                <span>Verified User</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-black text-white hover:bg-gray-900"
                                        onClick={() => navigate(
                                            showWorkerToOwner
                                                ? `/worker/${acceptedApp.worker_id}?hide_book=true`
                                                : `/profile/public/${task.created_by}`
                                        )}
                                    >
                                        View
                                    </Button>
                                </>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* Actions for Creator (Mark Complete) */}
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

            {/* Actions for Worker */}
            {!isOwner && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] flex gap-3 z-50 max-w-md mx-auto">

                    {/* If already hired, show Call & Chat */}
                    {isHired ? (
                        <>
                            <Button
                                variant="outline"
                                className="flex-1 border-green-200 bg-green-50 text-green-700"
                                onClick={() => window.location.href = `tel:${creator.phone}`}
                            >
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                            </Button>

                        </>
                    ) : (
                        /* Not Hired Yet */
                        task.status === 'open' ? (
                            <Button
                                className={`w-full ${!hasSufficientBalance ? 'bg-gray-400' : 'bg-black'} text-white`}
                                onClick={() => {
                                    if (!user) { navigate('/auth'); return }
                                    if (!profile?.is_worker) {
                                        setInfoModal({ isOpen: true, title: 'Worker Profile Required', message: 'You must have a Worker Profile.', type: 'error' }); return
                                    }
                                    setIsUnlockModalOpen(true)
                                }}
                                disabled={task.status !== 'open'}
                            >
                                <Wallet className="mr-2 h-4 w-4" />
                                Accept & Unlock (₹{commission})
                            </Button>
                        ) : (
                            <Button disabled className="w-full">Task Closed</Button>
                        )
                    )}
                </div>
            )}


            {/* Unlock Confirmation Modal */}
            <Modal
                isOpen={isUnlockModalOpen}
                onClose={() => setIsUnlockModalOpen(false)}
                title="Unlock Contact?"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Accepting this task will deduct <strong>₹{commission}</strong> from your wallet balance.
                    </p>

                    <div className="bg-slate-50 p-3 rounded-lg border flex justify-between items-center text-sm">
                        <span>Current Balance:</span>
                        <span className={`font-bold ${workerWallet?.wallet_balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                            ₹{workerWallet?.wallet_balance?.toFixed(2) || '0.00'}
                        </span>
                    </div>

                    {!hasSufficientBalance && (
                        <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 p-2 rounded">
                            <AlertTriangle size={16} />
                            <span>Insufficient balance. Minimum credit limit reached ({workerWallet?.min_credit_limit}). Please recharge.</span>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="secondary" onClick={() => setIsUnlockModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleUnlockContact}
                            disabled={contactLoading || !hasSufficientBalance}
                            className={!hasSufficientBalance ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            {contactLoading ? <Loader2 className="animate-spin" /> : `Pay ₹${commission} & Unlock`}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Completion Modal */}
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

            {/* Review Modal */}
            {
                applications.find(app => app.status === 'accepted') && (
                    <ReviewModal
                        isOpen={isReviewModalOpen}
                        onClose={() => setIsReviewModalOpen(false)}
                        taskId={id}
                        workerId={applications.find(app => app.status === 'accepted')?.worker_id}
                        reviewerId={user?.id}
                        onReviewSubmitted={async () => {
                            await queryClient.invalidateQueries({ queryKey: ['task', id] })
                            setInfoModal({ isOpen: true, title: 'Thanks!', message: 'Review submitted.', type: 'success' })
                        }}
                    />
                )
            }

            {/* Info/Error Modal */}
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
