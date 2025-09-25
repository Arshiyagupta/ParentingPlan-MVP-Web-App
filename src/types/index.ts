export type TurnRole = 'A' | 'B'
export type PairStatus = 'active' | 'completed'
export type InviteStatus = 'sent' | 'accepted' | 'expired'
export type SlotState = 'locked' | 'active' | 'completed'

export interface Profile {
  id: string
  email: string
  connection_code: string
  created_at: string
}

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

export interface Quality {
  id: string
  pair_id: string
  author_role: TurnRole
  round_number: number
  draft_text?: string
  ai_suggested_text?: string
  approved_text?: string
  approved_at?: string
  created_at: string
}

export interface Invite {
  id: string
  pair_id: string
  inviter_user_id: string
  invitee_email: string
  token: string
  status: InviteStatus
  created_at: string
  accepted_at?: string
}

export interface SlotData {
  state: SlotState
  text?: string
}

export interface ScoreboardSlot {
  round: number
  A: SlotData
  B: SlotData
}

export interface ScoreboardData {
  pair: Pair
  you: { role: TurnRole }
  coParent?: {
    role: TurnRole
    email?: string
    connected: boolean
  }
  slots: ScoreboardSlot[]
  progress: number
  connectionCode: string
  invite?: {
    sentTo: string
    status: InviteStatus
  }
}