import { createClient } from '@supabase/supabase-js'

// Temporary hardcoded values for testing - REMOVE THESE IN PRODUCTION
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhcizpafpmutcnckrjpu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY2l6cGFmcG11dGNuY2tyanB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTkwNzYsImV4cCI6MjA3NDMzNTA3Nn0.1Oc07p_Xe0oTbj3e3braXAsIKOSTrXJJEV9h6skmKg0'

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl ? 'present' : 'missing',
  actualUrl: supabaseUrl,
  key: supabaseAnonKey ? 'present' : 'missing',
  actualKeyStart: supabaseAnonKey?.substring(0, 20) + '...',
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length,
  usingFallback: !process.env.NEXT_PUBLIC_SUPABASE_URL
})

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`)
}

// Simplified client without custom cookie handling for testing
let supabase: any

try {
  console.log('Creating Supabase client with:', { url: supabaseUrl, keyStart: supabaseAnonKey.substring(0, 20) + '...' })
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('Supabase client created successfully')
} catch (error) {
  console.error('Failed to create Supabase client:', error)
  throw error
}

export { supabase }