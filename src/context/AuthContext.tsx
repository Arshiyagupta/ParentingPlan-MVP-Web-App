'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
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
      async (event, session) => {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password
        // No email confirmation options since it's disabled
      })

      if (error) {
        console.error('Signup error:', error)
        return { error }
      }

      // Store invite token for handling after authentication
      if (inviteToken && data.user) {
        // We'll pass this via the signup page redirect
        return { error: null, inviteToken }
      }

      return { error: null }
    } catch (error) {
      console.error('Signup error:', error)
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