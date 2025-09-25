import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabaseRoute'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Debug logging
    console.log('Test auth debug:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value, valueStart: c.value.substring(0, 20) }))
    })

    return NextResponse.json({
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: authError?.message || null,
      cookieCount: request.cookies.getAll().length
    })

  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}