import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase, uploadImage, deleteImage } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronLeft, Camera, Loader2, MapPin, Phone, User, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EditProfile() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        display_name: '',
        bio: '',
        location: '',
        phone: '',
        avatar_url: ''
    })

    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)

    useEffect(() => {
        if (profile) {
            setFormData({
                display_name: profile.display_name || '',
                bio: profile.bio || '',
                location: profile.location || '',
                phone: profile.phone || '',
                avatar_url: profile.avatar_url || ''
            })
            setAvatarPreview(profile.avatar_url)
        }
    }, [profile])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async () => {
        setLoading(true)

        try {
            let publicUrl = formData.avatar_url

            if (avatarFile) {
                // Delete old avatar if it exists
                if (formData.avatar_url) {
                    await deleteImage(formData.avatar_url)
                }
                publicUrl = await uploadImage(avatarFile, 'task_photos')
            }

            const updates = {
                display_name: formData.display_name,
                bio: formData.bio,
                location: formData.location,
                phone: formData.phone,
                avatar_url: publicUrl,
                updated_at: new Date()
            }

            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id)

            if (error) throw error

            navigate(-1)
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white min-h-screen pb-safe">
            {/* Header */}
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
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <Avatar src={avatarPreview} size="xl" className="w-32 h-32 border-4 border-white shadow-lg" />
                        <label className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                    <Input
                        label="Display Name"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        icon={<User size={18} />}
                    />

                    <Textarea
                        label="Bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Tell us a bit about yourself..."
                        className="min-h-[100px]"
                    />

                    <Input
                        label="Location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Mumbai, India"
                        icon={<MapPin size={18} />}
                    />

                    <Input
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        icon={<Phone size={18} />}
                    />
                </div>

                <Button onClick={handleSubmit} className="w-full h-12 text-base shadow-lg shadow-primary/20" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Save Changes
                </Button>
            </motion.div>
        </div>
    )
}
