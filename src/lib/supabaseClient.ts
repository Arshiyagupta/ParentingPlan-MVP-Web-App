import { createBrowserClient } from '@supabase/ssr'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl ? 'present' : 'missing',
  actualUrl: supabaseUrl,
  key: supabaseAnonKey ? 'present' : 'missing',
  actualKeyStart: supabaseAnonKey?.substring(0, 20) + '...',
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length,
})

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`)
}

// Create browser client with proper cookie handling for Next.js
let supabase: any

try {
  console.log('Creating Supabase browser client with:', { url: supabaseUrl, keyStart: supabaseAnonKey.substring(0, 20) + '...' })

  supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

  console.log('Supabase browser client created successfully')
} catch (error) {
  console.error('Failed to create Supabase client:', error)
  throw error
}

export { supabase }