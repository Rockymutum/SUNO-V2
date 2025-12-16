import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Camera, MapPin, ChevronLeft, X, Loader2 } from 'lucide-react'
import { supabase, uploadImage, deleteImage } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { CATEGORIES } from '@/lib/constants'

export default function EditTask() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [images, setImages] = useState([])
    const [deletedImages, setDeletedImages] = useState([])
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        budget_min: '',
        budget_max: '',
        location: '',
    })

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const { data, error } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error

                // Verify ownership
                if (user && data.created_by !== user.id) {
                    alert("You don't have permission to edit this task")
                    navigate('/')
                    return
                }

                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    category: data.category || '', // Assuming category is stored as string matching TaskCreate
                    budget_min: data.budget_min || '',
                    budget_max: data.budget_max || '',
                    location: data.location || '',
                })
                setImages(data.photos || [])
            } catch (error) {
                console.error('Error fetching task:', error)
                navigate('/')
            } finally {
                setFetching(false)
            }
        }

        if (user) {
            fetchTask()
        }
    }, [id, user, navigate])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        // Clear error for this field when user starts typing
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null })
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            setLoading(true)
            const url = await uploadImage(file, 'task_photos') // Assuming 'task_photos' bucket exists
            if (url) {
                setImages([...images, url])
            }
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Failed to upload image')
        } finally {
            setLoading(false)
        }
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.title?.trim()) newErrors.title = 'Title is required'
        if (!formData.description?.trim()) newErrors.description = 'Description is required'
        if (!formData.category?.trim()) newErrors.category = 'Category is required'
        if (!formData.budget_min) newErrors.budget_min = 'Min budget is required'
        if (!formData.budget_max) newErrors.budget_max = 'Max budget is required'
        if (!formData.location?.trim()) newErrors.location = 'Location is required'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validateForm()) {
            return
        }
        if (!user) return
        setLoading(true)

        try {
            // Delete removed images
            if (deletedImages.length > 0) {
                await Promise.all(deletedImages.map(url => deleteImage(url)))
            }

            const { error } = await supabase
                .from('tasks')
                .update({
                    title: formData.title,
                    description: formData.description,
                    budget_min: formData.budget_min,
                    budget_max: formData.budget_max,
                    location: formData.location,
                    category: formData.category,
                    photos: images,
                    updated_at: new Date()
                })
                .eq('id', id)

            if (error) throw error
            navigate(-1) // Go back to previous page
        } catch (error) {
            console.error('Error updating task:', error)
            alert('Failed to update task')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>
    )

    return (
        <div className="bg-white min-h-screen pb-safe">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white z-50 px-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-sm font-bold uppercase tracking-widest">Edit Task</h1>
                <div className="w-8" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-20 px-5 space-y-6 max-w-md mx-auto"
            >
                <Input
                    label="Task Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    error={errors.title}
                />

                <Textarea
                    label="Description"
                    name="description"
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
                    error={errors.category}
                />

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
                                <img src={img} alt="Upload" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => {
                                        setDeletedImages([...deletedImages, img])
                                        setImages(images.filter((_, idx) => idx !== i))
                                    }}
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
                        value={formData.budget_min}
                        onChange={handleChange}
                        error={errors.budget_min}
                    />
                    <Input
                        label="Max Budget"
                        name="budget_max"
                        type="number"
                        value={formData.budget_max}
                        onChange={handleChange}
                        error={errors.budget_max}
                    />
                </div>

                <Input
                    label="Location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    icon={<MapPin size={18} />}
                    error={errors.location}
                />

                <Button onClick={handleSubmit} isLoading={loading} className="w-full h-12 text-lg mt-4">
                    Save Changes
                </Button>
            </motion.div>
        </div>
    )
}
