import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export function createRouteHandlerClient(request: NextRequest, response?: NextResponse) {
  let responseToUse = response
  if (!responseToUse) {
    responseToUse = NextResponse.next()
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        const value = request.cookies.get(name)?.value
        console.log(`🍪 Getting cookie ${name}:`, value ? 'found' : 'missing')
        return value
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options,
        })
        responseToUse.cookies.set({
          name,
          value,
          ...options,
        })
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        })
        responseToUse.cookies.set({
          name,
          value: '',
          ...options,
        })
      },
    },
  })
}