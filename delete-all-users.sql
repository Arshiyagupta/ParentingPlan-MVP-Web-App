-- DELETE ALL USERS AND DATA - USE WITH CAUTION
-- This script will completely wipe all user data from the database
-- Run this in Supabase SQL Editor

-- Start transaction for safety
BEGIN;

-- Delete all application data first (in order due to foreign key constraints)
DELETE FROM events;
DELETE FROM qualities;
DELETE FROM invites;
DELETE FROM pair_members;
DELETE FROM pairs;
DELETE FROM profiles;

-- Delete from Supabase auth.users table (this is the main users table)
-- This will cascade delete any remaining references
DELETE FROM auth.users;

-- Reset any sequences if needed
-- ALTER SEQUENCE IF EXISTS auth.users_id_seq RESTART WITH 1;

-- Commit the transaction
COMMIT;

-- Verify deletion (should return 0 for all)
SELECT 'events' as table_name, COUNT(*) as count FROM events
UNION ALL
SELECT 'qualities', COUNT(*) FROM qualities
UNION ALL
SELECT 'invites', COUNT(*) FROM invites
UNION ALL
SELECT 'pair_members', COUNT(*) FROM pair_members
UNION ALL
SELECT 'pairs', COUNT(*) FROM pairs
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users;