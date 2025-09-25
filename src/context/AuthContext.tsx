'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, inviteToken?: string) => Promise<{ error: any; inviteToken?: string }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, inviteToken?: string) => {
    try {
      console.log('🔄 Starting signup process...', { email, hasInviteToken: !!inviteToken })

      // Test Supabase client availability first
      if (!supabase) {
        console.error('❌ Supabase client not available')
        return { error: new Error('Authentication service unavailable') }
      }

      console.log('✅ Supabase client available, attempting signup...')

      const { data, error } = await supabase.auth.signUp({
        email,
        password
        // No email confirmation options since it's disabled
      })

      console.log('📝 Signup response:', {
        hasData: !!data,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasError: !!error,
        errorMessage: error?.message,
        errorDetails: error
      })

      if (error) {
        console.error('❌ Signup error:', error)
        return { error }
      }

      // Store invite token for handling after authentication
      if (inviteToken && data.user) {
        console.log('🎟️ Returning with invite token for processing')
        return { error: null, inviteToken }
      }

      console.log('✅ Signup successful!')
      return { error: null }
    } catch (error) {
      console.error('💥 Signup network/fetch error:', error)
      console.error('Error type:', typeof error)
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
      console.error('Error message:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Signin error:', error)
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error('Signin error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Signout error:', error)
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error('Signout error:', error)
      return { error }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}