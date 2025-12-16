import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Simple .env parser to avoid dependencies
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.log('Env:', env)
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log('Checking for category column...')

    const { data, error } = await supabase
        .from('users')
        .select('category')
        .limit(1)

    if (error) {
        console.error('❌ Error accessing category column:', error.message)
    } else {
        console.log('✅ Success! category column is accessible.')
    }
}

checkSchema()
