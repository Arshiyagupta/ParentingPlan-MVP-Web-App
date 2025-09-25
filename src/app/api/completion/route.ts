import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getOrCreateActivePairForUser } from '@/lib/pairs'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser(request)

    // Get user's pair and role
    const { pair } = await getOrCreateActivePairForUser(user.userId)

    // Ensure pair is completed
    if (pair.status !== 'completed') {
      return NextResponse.json(
        { error: 'Pair is not yet completed' },
        { status: 400 }
      )
    }

    // Get all approved qualities for this pair
    const { data: qualities, error: qualitiesError } = await supabaseServer
      .from('qualities')
      .select('*')
      .eq('pair_id', pair.id)
      .eq('approved_text', 'IS NOT', null)
      .order('round_number', { ascending: true })
      .order('author_role', { ascending: true })

    if (qualitiesError) {
      throw new Error(`Failed to get qualities: ${qualitiesError.message}`)
    }

    // Get pair members to get their emails/names
    const { data: members, error: membersError } = await supabaseServer
      .from('pair_members')
      .select(`
        role,
        profiles (
          email,
          connection_code
        )
      `)
      .eq('pair_id', pair.id)

    if (membersError) {
      throw new Error(`Failed to get pair members: ${membersError.message}`)
    }

    // Format the results for the completion screen
    const statements = qualities.map(quality => ({
      round: quality.round_number,
      author: quality.author_role,
      text: quality.approved_text,
      authorEmail: members?.find(m => m.role === quality.author_role)?.profiles?.email || 'Unknown'
    }))

    // Log completion event (optional)
    try {
      const existingEvent = await supabaseServer
        .from('events')
        .select('id')
        .eq('pair_id', pair.id)
        .eq('type', 'flow_completed')
        .single()

      if (!existingEvent.data) {
        await supabaseServer
          .from('events')
          .insert({
            pair_id: pair.id,
            user_id: user.userId,
            type: 'flow_completed',
            metadata: { total_statements: statements.length }
          })
      }
    } catch (eventError) {
      console.error('Failed to log completion event:', eventError)
      // Don't fail the request if event logging fails
    }

    return NextResponse.json({
      pair: {
        id: pair.id,
        completedAt: pair.created_at, // We could add a completed_at field if needed
        totalStatements: statements.length
      },
      statements,
      members: {
        A: members?.find(m => m.role === 'A')?.profiles?.email || 'Unknown',
        B: members?.find(m => m.role === 'B')?.profiles?.email || 'Unknown'
      }
    })

  } catch (error) {
    console.error('Completion API error:', error)

    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get completion data' },
      { status: 500 }
    )
  }
}