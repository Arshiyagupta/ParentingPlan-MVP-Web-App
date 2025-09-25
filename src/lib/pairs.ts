import { supabaseServer } from './supabaseServer'

export type TurnRole = 'A' | 'B'
export type PairStatus = 'active' | 'completed'

export interface Pair {
  id: string
  status: PairStatus
  current_round: number
  current_turn: TurnRole
  created_at: string
}

export interface PairMember {
  pair_id: string
  user_id: string
  role: TurnRole
  joined_at: string
}

export async function getOrCreateActivePairForUser(userId: string): Promise<{ pair: Pair; role: TurnRole }> {
  // First, check if user already has an active pair
  const { data: existingMember, error: memberError } = await supabaseServer
    .from('pair_members')
    .select(`
      pair_id,
      role,
      pairs!inner (
        id,
        status,
        current_round,
        current_turn,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('pairs.status', 'active')
    .single()

  if (existingMember && !memberError) {
    return {
      pair: existingMember.pairs as any,
      role: existingMember.role as TurnRole
    }
  }

  // No existing active pair, create a new one with user as role A
  const { data: newPair, error: pairError } = await supabaseServer
    .from('pairs')
    .insert({})
    .select()
    .single()

  if (pairError) {
    throw new Error(`Failed to create pair: ${pairError.message}`)
  }

  // Add user as member with role A
  const { error: memberInsertError } = await supabaseServer
    .from('pair_members')
    .insert({
      pair_id: newPair.id,
      user_id: userId,
      role: 'A'
    })

  if (memberInsertError) {
    throw new Error(`Failed to create pair member: ${memberInsertError.message}`)
  }

  return {
    pair: newPair,
    role: 'A'
  }
}

export async function getMemberRole(pairId: string, userId: string): Promise<TurnRole | null> {
  const { data, error } = await supabaseServer
    .from('pair_members')
    .select('role')
    .eq('pair_id', pairId)
    .eq('user_id', userId)
    .single()

  if (error) {
    return null
  }

  return data.role as TurnRole
}

export async function getPairWithMembers(pairId: string) {
  const { data, error } = await supabaseServer
    .from('pairs')
    .select(`
      *,
      pair_members (
        user_id,
        role,
        joined_at,
        profiles (
          email,
          connection_code
        )
      )
    `)
    .eq('id', pairId)
    .single()

  if (error) {
    throw new Error(`Failed to get pair: ${error.message}`)
  }

  return data
}