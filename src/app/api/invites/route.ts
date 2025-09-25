import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { getOrCreateActivePairForUser } from '@/lib/pairs'
import { supabaseServer } from '@/lib/supabaseServer'
import { sendInviteEmail } from '@/lib/email'

const InviteRequestSchema = z.object({
  email: z.string().email()
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser(request)

    // Parse and validate request body
    const body = await request.json()
    const { email } = InviteRequestSchema.parse(body)

    // Get user's pair and role
    const { pair, role } = await getOrCreateActivePairForUser(user.userId)

    // Ensure user has a pair (typically A invites after Round 1)
    if (!pair) {
      return NextResponse.json(
        { error: 'No active pair found' },
        { status: 400 }
      )
    }

    // Get A's Round 1 approved text for the email preview
    const { data: round1Quality, error: qualityError } = await supabaseServer
      .from('qualities')
      .select('approved_text')
      .eq('pair_id', pair.id)
      .eq('author_role', 'A')
      .eq('round_number', 1)
      .single()

    if (qualityError || !round1Quality?.approved_text) {
      return NextResponse.json(
        { error: 'No approved Round 1 quality found to share in invitation' },
        { status: 400 }
      )
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabaseServer
      .from('invites')
      .insert({
        pair_id: pair.id,
        inviter_user_id: user.userId,
        invitee_email: email
      })
      .select()
      .single()

    if (inviteError) {
      throw new Error(`Failed to create invite: ${inviteError.message}`)
    }

    // Get inviter's connection code for the email
    const inviterConnectionCode = user.profile.connection_code

    // Send invitation email
    try {
      await sendInviteEmail({
        inviteeEmail: email,
        inviterEmail: user.email,
        pairId: pair.id,
        token: invite.token,
        connectionCode: inviterConnectionCode,
        approvedTextPreview: round1Quality.approved_text
      })
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
      // Don't fail the whole request if email fails
      // The invite record is still created
    }

    // Log event (optional)
    try {
      await supabaseServer
        .from('events')
        .insert({
          pair_id: pair.id,
          user_id: user.userId,
          type: 'invite_sent',
          metadata: { invitee_email: email }
        })
    } catch (eventError) {
      console.error('Failed to log invite event:', eventError)
      // Don't fail the request if event logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully'
    })

  } catch (error) {
    console.error('Invites API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.errors },
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
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}