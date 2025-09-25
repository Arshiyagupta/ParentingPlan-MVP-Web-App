import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { getOrCreateActivePairForUser, getMemberRole } from '@/lib/pairs'
import { validateTurn, advanceTurn } from '@/lib/turnEngine'
import { sanitizeText, validateTextLength } from '@/lib/utils'
import { supabaseServer } from '@/lib/supabaseServer'
import { sendTurnEmail } from '@/lib/email'

const ApproveRequestSchema = z.object({
  roundNumber: z.number().min(1).max(5),
  approvedText: z.string().min(1).max(500)
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser(request)

    // Parse and validate request body
    const body = await request.json()
    const { roundNumber, approvedText } = ApproveRequestSchema.parse(body)

    // Sanitize input
    const cleanText = sanitizeText(approvedText)

    if (!validateTextLength(cleanText, 500)) {
      return NextResponse.json(
        { error: 'Approved text is too long (max 500 characters)' },
        { status: 400 }
      )
    }

    // Get user's pair and role
    const { pair, role } = await getOrCreateActivePairForUser(user.userId)

    // Validate it's the user's turn
    validateTurn(pair, role, roundNumber)

    // Use transaction for atomic operation
    const result = await supabaseServer.rpc('approve_quality_and_advance_turn', {
      p_pair_id: pair.id,
      p_author_role: role,
      p_round_number: roundNumber,
      p_approved_text: cleanText,
      p_user_id: user.userId
    })

    if (result.error) {
      throw new Error(`Transaction failed: ${result.error.message}`)
    }

    // Check if this is A's Round 1 approval and no accepted invite exists
    let needsInvite = false
    if (role === 'A' && roundNumber === 1) {
      const { data: acceptedInvite } = await supabaseServer
        .from('invites')
        .select('id')
        .eq('pair_id', pair.id)
        .eq('status', 'accepted')
        .single()

      if (!acceptedInvite) {
        needsInvite = true
      }
    }

    // Get updated pair state
    const { data: updatedPair, error: pairError } = await supabaseServer
      .from('pairs')
      .select('*')
      .eq('id', pair.id)
      .single()

    if (pairError) {
      throw new Error(`Failed to get updated pair: ${pairError.message}`)
    }

    // Send turn notification to the next player (if pair is still active and not needs invite)
    if (updatedPair.status === 'active' && !needsInvite) {
      try {
        // Get the email of the user whose turn it is now
        const { data: nextUser } = await supabaseServer
          .from('pair_members')
          .select(`
            profiles (email)
          `)
          .eq('pair_id', pair.id)
          .eq('role', updatedPair.current_turn)
          .single()

        if (nextUser?.profiles?.email) {
          await sendTurnEmail({
            recipientEmail: nextUser.profiles.email,
            roundNumber: updatedPair.current_round,
            appreciationMessage: cleanText
          })
        }
      } catch (emailError) {
        console.error('Failed to send turn notification:', emailError)
        // Don't fail the whole request if email fails
      }
    }

    // Return response
    const response: any = {
      success: true,
      pair: {
        id: updatedPair.id,
        status: updatedPair.status,
        current_round: updatedPair.current_round,
        current_turn: updatedPair.current_turn
      },
      progress: result.data?.progress || 0
    }

    if (needsInvite) {
      response.needsInvite = true
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Approve API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'Not authenticated') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      if (error.message.includes('turn') || error.message.includes('round')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to approve quality' },
      { status: 500 }
    )
  }
}