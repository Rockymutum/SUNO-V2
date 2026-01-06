import { createClient } from '@supabase/supabase-js'
import imageCompression from 'browser-image-compression'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables! Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Helper Functions ---

// Compress image before upload
const compressImage = async (file) => {
    try {
        const options = {
            maxSizeMB: 1, // Aim for ~1MB
            maxWidthOrHeight: 1920, // Max dimension 1920px (standard HD)
            useWebWorker: true,
            initialQuality: 0.8
        }

        console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
        const compressedFile = await imageCompression(file, options)
        console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`)

        return compressedFile
    } catch (error) {
        console.error('Error compressing image:', error)
        // If compression fails, return original file to be checked for size later
        return file
    }
}

// Upload image to Supabase Storage with "Safety Guard"
export const uploadImage = async (file, bucket = 'task_photos') => {
    if (!file) return null

    // 1. Attempt Compression
    // compressImage guarantees returning a File object (compressed or original)
    const fileToUpload = await compressImage(file)

    // 2. Final Hard Size Check - Zero Trust
    const MAX_SIZE_MB = 5
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

    if (fileToUpload.size > MAX_SIZE_BYTES) {
        const sizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2)
        throw new Error(`File too large (${sizeMB} MB). Maximum allowed is ${MAX_SIZE_MB} MB.`)
    }

    // 3. Upload
    const fileExt = fileToUpload.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload)

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
