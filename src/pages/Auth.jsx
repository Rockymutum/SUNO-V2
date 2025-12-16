import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { Mail, Lock, User, ArrowRight, Loader2, Chrome } from 'lucide-react'

export default function Auth() {
    const navigate = useNavigate()
    const { signInWithGoogle } = useAuth()
    const [mode, setMode] = useState('signin') // 'signin' | 'signup'
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: ''
    })
    const [error, setError] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        // Clear previous success message if any (though we are using 'error' state for it, maybe better to add success state?)
        // The implementation plan said "display a success message". 
        // I will use a simple alert for now OR better, add a success state variable? 
        // The existing code uses `setError`. I'll stick to the plan which implies just showing a message.
        // Let's add a `success` state to be cleaner.

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            full_name: formData.fullName,
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${formData.fullName}`
                        }
                    }
                })
                if (error) throw error

                // Success path for signup
                setMode('signin')
                // We need to show the message. I'll add a success prop/state.
                // Since I can't easily add a new state var in this single block smoothly without re-reading the whole file to find where to add it...
                // Wait, I can't add state hooks inside a function. 
                // I should probably edit the whole component to add the state or just use `setError` with a positive color in the render? 
                // Or just `alert`? The prompt said "display a success message". 
                // The implementation plan didn't specify exact mechanism.
                // Let's look at the file content again. I need to be careful.
                // Actually, I can use `setError` but it renders red.
                // I will use `alert` as a temporary simple fix OR better:
                // I will add a `success` state variable at the top of the component in a separate edit or just edit the whole file. 
                // Scanning `Auth.jsx` again... it's small enough. I'll just edit the `handleAuth` first and maybe `setError("SUCCESS: ...")` and handle it in render?
                // No, hacking `error` is bad.
                // I'll assume I can just use `alert` for now as it's robust, OR since I have `replace_file_content` I can do a larger replacement if needed.
                // Actually, I'll just use `alert` for now to be safe and simple as per request to "do it", 
                // BUT the user wants "show success message" which usually implies UI.
                // Let's look at the `return` JSX. 
                // `error` is rendered in a red box.
                // I'll modify the `handleAuth` to basically just throw an error with the message "Registration successful!..." but then catch it? No.
                // I'll use `window.alert` to ensure they see it, then switch mode. 
                // "Registration successful! Please verify your email and head to the sign in page."
                // Wait, `setMode('signin')` effectively switches the view.

                setShowSuccessModal(true)

            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                })
                if (error) throw error
                navigate('/')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full justify-center px-6">
            <Modal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Registration Successful"
            >
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <Mail size={24} />
                    </div>
                    <p className="text-gray-600">
                        Registration successful! Please verify your email and head to the sign in page.
                    </p>
                    <Button
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full"
                    >
                        Got it, heading to Sign In
                    </Button>
                </div>
            </Modal>
            <div className="w-full max-w-sm mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter">SUNOMSI</h1>
                    <p className="text-muted text-sm tracking-wide uppercase">
                        {mode === 'signin' ? 'Welcome Back' : 'Join the Network'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setMode('signin')}
                        className={`py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'signin' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {mode === 'signup' && (
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all font-medium"
                                            placeholder="John Doe"
                                            value={formData.fullName}
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all font-medium"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 block">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all font-medium"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-medium">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full h-12 text-sm" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={16} className="ml-2" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground text-gray-400 font-medium">
                            Or continue with
                        </span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-medium bg-white hover:bg-slate-50 border-slate-200"
                    onClick={signInWithGoogle}
                >
                    {/* Using a simple generic icon if Google logo isn't available in Lucide or use Chrome icon as proxy */}
                    <Chrome size={18} className="mr-2 text-slate-700" />
                    Google
                </Button>
            </div>
        </div>
    )
}

// Needed for AnimatePresence
import { AnimatePresence } from 'framer-motion'
