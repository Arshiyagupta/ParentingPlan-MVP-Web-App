-- SafeTalk Database Migration Script (Safe Version)
-- Run this in Supabase SQL Editor

-- Create Enums (with IF NOT EXISTS check)
DO $$ BEGIN
    CREATE TYPE turn_role AS ENUM ('A', 'B');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pair_status AS ENUM ('active', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('sent', 'accepted', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Profiles Table (with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  connection_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create Pairs Table
CREATE TABLE IF NOT EXISTS pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status pair_status NOT NULL DEFAULT 'active',
  current_round smallint NOT NULL DEFAULT 1, -- 1..5
  current_turn turn_role NOT NULL DEFAULT 'A',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create Pair Members Table
CREATE TABLE IF NOT EXISTS pair_members (
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role turn_role NOT NULL, -- 'A' or 'B'
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pair_id, user_id),
  UNIQUE (pair_id, role)
);

-- Create Invites Table
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid REFERENCES pairs(id) ON DELETE CASCADE,
  inviter_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status invite_status NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

-- Create indexes (safe)
CREATE INDEX IF NOT EXISTS invites_token_idx ON invites (token);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites (invitee_email);

-- Create Qualities Table (each round entry)
CREATE TABLE IF NOT EXISTS qualities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  author_role turn_role NOT NULL,  -- 'A' or 'B'
  round_number smallint NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  draft_text text,
  ai_suggested_text text,
  approved_text text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pair_id, author_role, round_number)
);

CREATE INDEX IF NOT EXISTS qualities_pair_round_idx ON qualities (pair_id, round_number);

-- Create Events Table (optional analytics)
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid REFERENCES pairs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'signup_completed','invite_sent', etc.
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (safe)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pair_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "pairs_member_select" ON pairs;
DROP POLICY IF EXISTS "pair_members_self_select" ON pair_members;
DROP POLICY IF EXISTS "qualities_member_select" ON qualities;

-- RLS Policies for Profiles
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Pairs (membership-based)
CREATE POLICY "pairs_member_select" ON pairs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pair_members pm WHERE pm.pair_id = id AND pm.user_id = auth.uid())
  );

-- RLS Policies for Pair Members
CREATE POLICY "pair_members_self_select" ON pair_members
  FOR SELECT USING (user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM pair_members pm WHERE pm.pair_id = pair_members.pair_id AND pm.user_id = auth.uid())
  );

-- RLS Policies for Qualities
CREATE POLICY "qualities_member_select" ON qualities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pair_members pm WHERE pm.pair_id = qualities.pair_id AND pm.user_id = auth.uid())
  );

-- Insert/Update policies are intentionally omitted - all writes go through server routes using service role