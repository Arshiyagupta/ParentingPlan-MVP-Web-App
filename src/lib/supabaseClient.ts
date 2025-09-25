import { createBrowserClient } from '@supabase/ssr'

// Temporary hardcoded values for testing - REMOVE THESE IN PRODUCTION
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhcizpafpmutcnckrjpu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY2l6cGFmcG11dGNuY2tyanB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTkwNzYsImV4cCI6MjA3NDMzNTA3Nn0.1Oc07p_Xe0oTbj3e3braXAsIKOSTrXJJEV9h6skmKg0'

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl ? 'present' : 'missing',
  key: supabaseAnonKey ? 'present' : 'missing',
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length,
  usingFallback: !process.env.NEXT_PUBLIC_SUPABASE_URL
})

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`)
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) {
      if (typeof document === 'undefined') return undefined
      const cookies = document.cookie
        .split(';')
        .map(c => c.trim().split('='))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, string>)
      return cookies[name]
    },
    set(name: string, value: string, options: any = {}) {
      if (typeof document === 'undefined') return
      const expires = options.expires ? new Date(options.expires).toUTCString() : ''
      const secure = options.secure ? 'Secure' : ''
      const sameSite = options.sameSite || 'lax'
      const path = options.path || '/'

      document.cookie = `${name}=${value}; expires=${expires}; path=${path}; SameSite=${sameSite}; ${secure}`
    },
    remove(name: string, options: any = {}) {
      if (typeof document === 'undefined') return
      const path = options.path || '/'
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
    }
  }
})