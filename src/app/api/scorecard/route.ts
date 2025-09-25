import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getOrCreateActivePairForUser, getMemberRole } from '@/lib/pairs'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser(request)

    // Get or create active pair for user
    const { pair, role } = await getOrCreateActivePairForUser(user.userId)

    // Get all qualities for this pair
    const { data: qualities, error: qualitiesError } = await supabaseServer
      .from('qualities')
      .select('*')
      .eq('pair_id', pair.id)
      .order('round_number')

    if (qualitiesError) {
      throw new Error(`Failed to get qualities: ${qualitiesError.message}`)
    }

    // Get invite that this user sent
    const { data: invite, error: inviteError } = await supabaseServer
      .from('invites')
      .select('*')
      .eq('pair_id', pair.id)
      .eq('inviter_user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Build slots data structure
    const slots = []
    for (let round = 1; round <= 5; round++) {
      const roundQualities = qualities?.filter(q => q.round_number === round) || []
      const aQuality = roundQualities.find(q => q.author_role === 'A')
      const bQuality = roundQualities.find(q => q.author_role === 'B')

      // Determine state for each slot
      const getSlotState = (quality: any, authorRole: 'A' | 'B') => {
        // If pair is completed, all slots are completed
        if (pair.status === 'completed') {
          return quality?.approved_text ? 'completed' : 'locked'
        }

        // If quality is approved, it's completed
        if (quality?.approved_text) {
          return 'completed'
        }

        // If it's current round and current turn, it's active
        if (pair.current_round === round && pair.current_turn === authorRole) {
          return 'active'
        }

        // Otherwise it's locked
        return 'locked'
      }

      slots.push({
        round,
        A: {
          state: getSlotState(aQuality, 'A'),
          text: aQuality?.approved_text || null
        },
        B: {
          state: getSlotState(bQuality, 'B'),
          text: bQuality?.approved_text || null
        }
      })
    }

    // Calculate progress (number of approved qualities)
    const approvedQualities = qualities?.filter(q => q.approved_text) || []
    const progress = approvedQualities.length

    // Get co-parent info
    const { data: coParentData } = await supabaseServer
      .from('pair_members')
      .select(`
        role,
        profiles (email)
      `)
      .eq('pair_id', pair.id)
      .neq('user_id', user.userId)
      .single()

    // Format invite data
    let inviteData = null
    if (invite && !inviteError) {
      inviteData = {
        sentTo: invite.invitee_email,
        status: invite.status
      }
    }

    return NextResponse.json({
      pair: {
        id: pair.id,
        status: pair.status,
        current_round: pair.current_round,
        current_turn: pair.current_turn
      },
      you: {
        role
      },
      coParent: coParentData ? {
        role: coParentData.role,
        email: coParentData.profiles?.email,
        connected: true
      } : {
        connected: false
      },
      slots,
      progress,
      connectionCode: user.profile.connection_code,
      invite: inviteData
    })

  } catch (error) {
    console.error('Scorecard API error:', error)

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get scorecard data' },
      { status: 500 }
    )
  }
}