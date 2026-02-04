import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cgdnoyvylflbtxnqclwh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZG5veXZ5bGZsYnR4bnFjbHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDMzNzcsImV4cCI6MjA4MDc3OTM3N30.NCMEPLmlLP-r_sqadWphMDYB821wFxeVAK7lsahDQsM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findUsers() {
    const { data, error } = await supabase
        .from('public_user_details')
        .select('id, display_name')
        .limit(10)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Users found:')
    data.forEach(u => {
        console.log(`ID: ${u.id} | Name: ${u.display_name}`)
    })
}

findUsers()
