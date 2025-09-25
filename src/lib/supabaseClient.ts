import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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