import { supabaseServer } from './supabaseServer'
import { Pair, TurnRole } from './pairs'

export function validateTurn(pair: Pair, userRole: TurnRole, roundNumber: number): void {
  // Check if it's the user's turn
  if (pair.current_turn !== userRole) {
    throw new Error(`It's not your turn. Current turn: ${pair.current_turn}`)
  }

  // Check if it's the correct round
  if (pair.current_round !== roundNumber) {
    throw new Error(`Wrong round. Current round: ${pair.current_round}, requested: ${roundNumber}`)
  }

  // Check if pair is still active
  if (pair.status !== 'active') {
    throw new Error('Pair is no longer active')
  }

  // Check round bounds
  if (roundNumber < 1 || roundNumber > 5) {
    throw new Error('Round number must be between 1 and 5')
  }
}

export async function advanceTurn(pairId: string): Promise<void> {
  await supabaseServer.rpc('advance_turn', { p_pair_id: pairId })
}

// We need to create a database function for atomic turn advancement
export const ADVANCE_TURN_FUNCTION = `
CREATE OR REPLACE FUNCTION advance_turn(p_pair_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pair pairs%ROWTYPE;
  v_current_round_a_count int;
  v_current_round_b_count int;
BEGIN
  -- Get current pair state
  SELECT * INTO v_pair FROM pairs WHERE id = p_pair_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pair not found';
  END IF;

  -- Count approved qualities for current round
  SELECT
    COUNT(CASE WHEN author_role = 'A' AND approved_text IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN author_role = 'B' AND approved_text IS NOT NULL THEN 1 END)
  INTO v_current_round_a_count, v_current_round_b_count
  FROM qualities
  WHERE pair_id = p_pair_id AND round_number = v_pair.current_round;

  -- Logic for turn advancement
  IF v_current_round_a_count = 1 AND v_current_round_b_count = 1 THEN
    -- Both sides completed current round, advance to next round
    IF v_pair.current_round >= 5 THEN
      -- All rounds completed, mark pair as completed
      UPDATE pairs
      SET status = 'completed'
      WHERE id = p_pair_id;
    ELSE
      -- Move to next round, set turn to A
      UPDATE pairs
      SET current_round = current_round + 1,
          current_turn = 'A'
      WHERE id = p_pair_id;
    END IF;
  ELSIF v_current_round_a_count = 1 AND v_current_round_b_count = 0 AND v_pair.current_turn = 'A' THEN
    -- A completed, switch to B
    UPDATE pairs
    SET current_turn = 'B'
    WHERE id = p_pair_id;
  ELSIF v_current_round_b_count = 1 AND v_current_round_a_count = 1 AND v_pair.current_turn = 'B' THEN
    -- B completed after A, advance to next round
    IF v_pair.current_round >= 5 THEN
      -- All rounds completed, mark pair as completed
      UPDATE pairs
      SET status = 'completed'
      WHERE id = p_pair_id;
    ELSE
      -- Move to next round, set turn to A
      UPDATE pairs
      SET current_round = current_round + 1,
          current_turn = 'A'
      WHERE id = p_pair_id;
    END IF;
  ELSIF v_current_round_b_count = 1 AND v_current_round_a_count = 0 AND v_pair.current_turn = 'B' THEN
    -- B completed but A hasn't, switch turn to A (same round)
    UPDATE pairs
    SET current_turn = 'A'
    WHERE id = p_pair_id;
  END IF;
END;
$$;
`