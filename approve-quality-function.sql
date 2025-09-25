-- Approve quality and advance turn function for SafeTalk
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION approve_quality_and_advance_turn(
  p_pair_id uuid,
  p_author_role turn_role,
  p_round_number smallint,
  p_approved_text text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress int := 0;
BEGIN
  -- Upsert quality record
  INSERT INTO qualities (pair_id, author_role, round_number, approved_text, approved_at)
  VALUES (p_pair_id, p_author_role, p_round_number, p_approved_text, now())
  ON CONFLICT (pair_id, author_role, round_number)
  DO UPDATE SET
    approved_text = EXCLUDED.approved_text,
    approved_at = EXCLUDED.approved_at;

  -- Advance the turn
  PERFORM advance_turn(p_pair_id);

  -- Calculate progress (approved qualities count)
  SELECT COUNT(*) INTO v_progress
  FROM qualities
  WHERE pair_id = p_pair_id AND approved_text IS NOT NULL;

  -- Return progress
  RETURN json_build_object('progress', v_progress);
END;
$$;