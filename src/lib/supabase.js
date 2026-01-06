import { createClient } from '@supabase/supabase-js'
import imageCompression from 'browser-image-compression'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Helper Functions ---

// Compress image before upload
const compressImage = async (file) => {
    try {
        const options = {
            maxSizeMB: 0.2, // Max 200KB
            maxWidthOrHeight: 1080, // Max dimension 1080px
            useWebWorker: true // Use web worker for better performance
        }

        console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
        const compressedFile = await imageCompression(file, options)
        console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`)

        return compressedFile
    } catch (error) {
        console.error('Error compressing image:', error)
        // If compression fails, return original file
        return file
    }
}

// Upload image to Supabase Storage
export const uploadImage = async (file, bucket = 'task_photos') => {
    if (!file) return null

    // Compress image before upload
    const compressedFile = await compressImage(file)

    const fileExt = compressedFile.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile)

    if (uploadError) {
        throw uploadError
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data.publicUrl
}

// Delete image from Supabase Storage
export const deleteImage = async (url, bucket = 'task_photos') => {
    if (!url) return

    try {
        // Extract filename from URL
        // URL format: .../storage/v1/object/public/{bucket}/{filename}
        const fileName = url.split('/').pop()
        if (!fileName) return

        const { error } = await supabase.storage
            .from(bucket)
            .remove([fileName])

        if (error) {
            console.error('Error deleting image:', error)
            throw error
        }
    } catch (error) {
        console.error('Failed to delete image:', error)
    }
}

// Subscribe to messages (example)
export const subscribeToMessages = (conversationId, callback) => {
    return supabase
        .channel(`public:messages:conversation_id=eq.${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            },
            (payload) => callback(payload.new)
        )
        .subscribe()
}
