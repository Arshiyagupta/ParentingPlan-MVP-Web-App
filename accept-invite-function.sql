-- Accept invite transaction function for SafeTalk
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION accept_invite_transaction(
  p_invite_id uuid,
  p_pair_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_member_count int;
BEGIN
  -- Check if user is already a member of this pair
  SELECT COUNT(*) INTO v_existing_member_count
  FROM pair_members
  WHERE pair_id = p_pair_id AND user_id = p_user_id;

  -- If not already a member, add them as role B
  IF v_existing_member_count = 0 THEN
    INSERT INTO pair_members (pair_id, user_id, role)
    VALUES (p_pair_id, p_user_id, 'B');
  END IF;

  -- Mark invite as accepted
  UPDATE invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invite_id;

  -- Return success
  RETURN json_build_object('success', true);
END;
$$;