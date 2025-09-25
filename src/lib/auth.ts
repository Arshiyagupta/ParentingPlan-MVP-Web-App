import { createRouteHandlerClient } from './supabaseRoute'
import { supabaseServer } from './supabaseServer'
import { generateConnectionCode } from './utils'
import { NextRequest } from 'next/server'

export interface User {
  userId: string
  email: string
  profile: {
    id: string
    email: string
    connection_code: string
    created_at: string
  }
}

export async function getUser(request?: NextRequest): Promise<User> {
  const supabase = request ? createRouteHandlerClient(request) : supabaseServer

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Minimal debug logging
  if (authError && authError.message !== 'Auth session missing!') {
    console.log('Auth debug:', { authError: authError?.message, hasUser: !!user })
  }

  if (authError || !user) {
    console.error('Authentication failed:', authError)
    throw new Error('Not authenticated')
  }

  // Check if profile exists
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist, create it
  if (profileError && profileError.code === 'PGRST116') {
    const connectionCode = await generateUniqueConnectionCode()

    // Use server client to create profile (bypass RLS)
    const { data: newProfile, error: createError } = await supabaseServer
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        connection_code: connectionCode
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`Failed to create profile: ${createError.message}`)
    }

    profile = newProfile
  } else if (profileError) {
    throw new Error(`Profile error: ${profileError.message}`)
  }

  // If profile exists but missing connection_code, add it
  if (!profile.connection_code) {
    const connectionCode = await generateUniqueConnectionCode()

    const { data: updatedProfile, error: updateError } = await supabaseServer
      .from('profiles')
      .update({ connection_code: connectionCode })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }

    profile = updatedProfile
  }

  return {
    userId: user.id,
    email: user.email!,
    profile
  }
}

async function generateUniqueConnectionCode(): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const code = generateConnectionCode()

    // Check if code already exists
    const { data, error } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('connection_code', code)
      .single()

    if (error && error.code === 'PGRST116') {
      // Code doesn't exist, we can use it
      return code
    }

    attempts++
  }

  throw new Error('Failed to generate unique connection code')
}