import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Helper Functions ---

// Upload image to Supabase Storage
export const uploadImage = async (file, bucket = 'task_photos') => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

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
