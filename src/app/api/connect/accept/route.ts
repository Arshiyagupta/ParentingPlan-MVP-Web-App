import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'

const AcceptRequestSchema = z.object({
  token: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser(request)

    // Parse and validate request body
    const body = await request.json()
    const { token } = AcceptRequestSchema.parse(body)

    // Find the invite by token
    const { data: invite, error: inviteError } = await supabaseServer
      .from('invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'sent')
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      )
    }

    // Check if the invite email matches the user's email
    if (invite.invitee_email !== user.email) {
      return NextResponse.json(
        { error: 'This invitation is not for your email address' },
        { status: 400 }
      )
    }

    // Use transaction to handle the accept process
    const { data: result, error: transactionError } = await supabaseServer.rpc('accept_invite_transaction', {
      p_invite_id: invite.id,
      p_pair_id: invite.pair_id,
      p_user_id: user.userId
    })

    if (transactionError) {
      throw new Error(`Failed to accept invite: ${transactionError.message}`)
    }

    // Log event (optional)
    try {
      await supabaseServer
        .from('events')
        .insert({
          pair_id: invite.pair_id,
          user_id: user.userId,
          type: 'invite_accepted',
          metadata: { invite_id: invite.id }
        })
    } catch (eventError) {
      console.error('Failed to log accept event:', eventError)
      // Don't fail the request if event logging fails
    }

    // Get updated pair information
    const { data: pair, error: pairError } = await supabaseServer
      .from('pairs')
      .select('*')
      .eq('id', invite.pair_id)
      .single()

    if (pairError) {
      throw new Error(`Failed to get pair: ${pairError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the co-parenting pair',
      pair: {
        id: pair.id,
        status: pair.status,
        current_round: pair.current_round,
        current_turn: pair.current_turn
      },
      redirectTo: '/dashboard'
    })

  } catch (error) {
    console.error('Accept invite API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid token format', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}