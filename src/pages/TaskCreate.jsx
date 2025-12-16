import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { X, Camera, MapPin, ChevronLeft } from 'lucide-react'
import { supabase, uploadImage } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { CATEGORIES } from '@/lib/constants'

export default function TaskCreate() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [images, setImages] = useState([])
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        budget_min: '',
        budget_max: '',
        location: '',
    })

    const validateStep1 = () => {
        const newErrors = {}
        if (!formData.title.trim()) newErrors.title = 'Title is required'
        if (!formData.description.trim()) newErrors.description = 'Description is required'
        if (!formData.category.trim()) newErrors.category = 'Category is required'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const validateStep2 = () => {
        const newErrors = {}
        if (!formData.budget_min) newErrors.budget_min = 'Min budget is required'
        if (!formData.budget_max) newErrors.budget_max = 'Max budget is required'
        if (!formData.location.trim()) newErrors.location = 'Location is required'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null })
        }
    }

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setImages([...images, { file, preview: url }])
        }
    }

    const { user } = useAuth()

    const handleSubmit = async () => {
        if (!validateStep2()) {
            return
        }
        if (!user) return alert('You must be signed in to post a task')
        setLoading(true)

        try {
            // Upload images first
            const uploadedUrls = await Promise.all(
                images.map(async (img) => {
                    return await uploadImage(img.file)
                })
            )

            const { error } = await supabase.from('tasks').insert({
                title: formData.title,
                description: formData.description,
                budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
                budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
                location: formData.location,
                created_by: user.id,
                category: formData.category,
                photos: uploadedUrls
            })

            if (error) throw error

            await queryClient.invalidateQueries({ queryKey: ['tasks'] })
            navigate('/')
        } catch (error) {
            console.error('Error creating task:', error)
            alert('Failed to create task')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white min-h-screen pb-safe">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white z-50 px-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-sm font-bold uppercase tracking-widest">Post a Task</h1>
                <div className="w-8" />
            </div>

            <div className="pt-20 px-5 space-y-8 max-w-md mx-auto">
                {/* Progress */}
                <div className="flex gap-2">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
                </div>

                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">What do you need help with?</h2>
                            <p className="text-gray-500">Be descriptive to get the best offers.</p>
                        </div>

                        <Input
                            label="Task Title"
                            name="title"
                            placeholder="e.g. Broken pipe in kitchen"
                            value={formData.title}
                            onChange={handleChange}
                            error={errors.title}
                        />

                        <Textarea
                            label="Description"
                            name="description"
                            placeholder="Describe the issue, requirements, and timing..."
                            value={formData.description}
                            onChange={handleChange}
                            className="min-h-[150px]"
                            error={errors.description}
                        />

                        <Select
                            label="Category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            options={CATEGORIES.map(cat => ({ value: cat.id, label: cat.name }))}
                            placeholder="Select a category"
                        />

                        <Button onClick={() => {
                            if (validateStep1()) setStep(2)
                        }} className="w-full" size="lg">Next: Details</Button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Add photos & budget</h2>
                            <p className="text-gray-500">Help workers understand the scope.</p>
                        </div>

                        {/* Photo Upload */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Photos</label>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                <label className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-colors">
                                    <Camera size={24} />
                                    <span className="text-[10px] uppercase font-bold mt-1">Add Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                                {images.map((img, i) => (
                                    <div key={i} className="flex-shrink-0 w-24 h-24 relative rounded-xl overflow-hidden bg-gray-100">
                                        <img src={img.preview} alt="Upload" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Min Budget"
                                name="budget_min"
                                type="number"
                                placeholder="₹500"
                                value={formData.budget_min}
                                onChange={handleChange}
                                error={errors.budget_min}
                            />
                            <Input
                                label="Max Budget"
                                name="budget_max"
                                type="number"
                                placeholder="₹2000"
                                value={formData.budget_max}
                                onChange={handleChange}
                                error={errors.budget_max}
                            />
                        </div>

                        <Input
                            label="Location"
                            name="location"
                            placeholder="Current Location"
                            value={formData.location}
                            onChange={handleChange}
                            icon={<MapPin size={18} />}
                            error={errors.location}
                        />

                        <div className="flex gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
                            <Button onClick={handleSubmit} isLoading={loading} className="flex-[2]">Post Task</Button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
