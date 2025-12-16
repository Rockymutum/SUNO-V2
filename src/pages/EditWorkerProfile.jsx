import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase, uploadImage, deleteImage } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ChevronLeft, Briefcase, MapPin, DollarSign, Wrench, Loader2, Image as ImageIcon, X } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EditWorkerProfile() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        job_title: '',
        hourly_rate: '',
        skills: '',
        location: '',
        category: '',
        bio: '',
        portfolio_photos: []
    })

    const CATEGORIES = [
        { id: 'plumbing', name: 'Plumbing' },
        { id: 'electrical', name: 'Electrical' },
        { id: 'moving', name: 'Moving' },
        { id: 'painting', name: 'Painting' },
        { id: 'cleaning', name: 'Cleaning' },
        { id: 'carpentry', name: 'Carpentry' },
        { id: 'caretaker', name: 'Caretaker' },
        { id: 'driver', name: 'Driver' },
        { id: 'cook', name: 'Cook' },
        { id: 'gardener', name: 'Gardener' },
        { id: 'developer', name: 'Developer' },
        { id: 'pest_control', name: 'Pest Control' },
        { id: 'others', name: 'Others' }
    ]

    const [uploading, setUploading] = useState(false)
    const [deletedPhotos, setDeletedPhotos] = useState([])

    useEffect(() => {
        if (profile) {
            setFormData({
                job_title: profile.job_title || '',
                hourly_rate: profile.hourly_rate || '',
                skills: profile.skills ? profile.skills.join(', ') : '',
                location: profile.location || '',
                category: profile.category || '',
                bio: profile.bio || '',
                portfolio_photos: profile.portfolio_photos || []
            })
        }
    }, [profile])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setUploading(true)
        try {
            const uploadPromises = files.map(file => uploadImage(file, 'task_photos'))
            const newUrls = await Promise.all(uploadPromises)

            setFormData(prev => ({
                ...prev,
                portfolio_photos: [...prev.portfolio_photos, ...newUrls.filter(url => url !== null)]
            }))
        } catch (error) {
            console.error('Error uploading photos:', error)
            alert('Failed to upload photos')
        } finally {
            setUploading(false)
        }
    }

    const removePhoto = (indexToRemove) => {
        const photoToRemove = formData.portfolio_photos[indexToRemove]
        setDeletedPhotos([...deletedPhotos, photoToRemove])

        setFormData(prev => ({
            ...prev,
            portfolio_photos: prev.portfolio_photos.filter((_, index) => index !== indexToRemove)
        }))
    }

    const handleSubmit = async () => {
        setLoading(true)

        try {
            // Convert comma-separated skills string to array
            const skillsArray = formData.skills
                .split(',')
                .map(skill => skill.trim())
                .filter(skill => skill.length > 0)

            // Delete removed photos
            if (deletedPhotos.length > 0) {
                await Promise.all(deletedPhotos.map(url => deleteImage(url)))
            }

            const updates = {
                job_title: formData.job_title,
                hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
                skills: skillsArray,
                location: formData.location,
                category: formData.category,
                bio: formData.bio,
                portfolio_photos: formData.portfolio_photos,
                updated_at: new Date()
            }

            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id)

            if (error) throw error

            navigate(-1)
        } catch (error) {
            console.error('Error updating worker profile:', error)
            alert('Failed to update worker profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white min-h-screen pb-safe">
            {/* Header */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-primary hover:bg-white shadow-sm z-50 border border-slate-100"
            >
                <ChevronLeft size={24} />
            </button>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-24 px-5 space-y-8 max-w-md mx-auto pb-10"
            >
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Worker Settings</h1>
                    <p className="text-sm text-gray-500">Update your professional details</p>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                    <Input
                        label="Job Title"
                        name="job_title"
                        value={formData.job_title}
                        onChange={handleChange}
                        placeholder="e.g. Expert Plumber"
                        icon={<Briefcase size={18} />}
                    />

                    <Input
                        label="Hourly Rate (₹)"
                        name="hourly_rate"
                        type="number"
                        value={formData.hourly_rate}
                        onChange={handleChange}
                        placeholder="e.g. 500"
                        icon={<DollarSign size={18} />}
                    />

                    <Select
                        label="Category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        options={CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Select a category"
                    />

                    <Input
                        label="Skills (comma separated)"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="e.g. Leak Fix, Pipe Fitting, Installation"
                        icon={<Wrench size={18} />}
                    />

                    <Input
                        label="Location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Downtown, Mumbai"
                        icon={<MapPin size={18} />}
                    />

                    <Textarea
                        label="Professional Bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Describe your experience and services..."
                        className="min-h-[100px]"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 block">Past Work Photos</label>
                    <div className="grid grid-cols-3 gap-2">
                        {formData.portfolio_photos.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                                <img src={url} alt={`Work ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="flex flex-col items-center justify-center aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            {uploading ? (
                                <Loader2 size={24} className="text-gray-400 animate-spin" />
                            ) : (
                                <>
                                    <ImageIcon size={24} className="text-gray-400 mb-1" />
                                    <span className="text-[10px] text-gray-500 font-medium">Add Photo</span>
                                </>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                <Button onClick={handleSubmit} className="w-full h-12 text-base shadow-lg shadow-primary/20" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Save Worker Profile
                </Button>
            </motion.div>
        </div>
    )
}
