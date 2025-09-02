-- Fix for User Creation Database Constraint Issues
-- Date: 2025-08-27
-- Issue: Profile creation fails due to incorrect ID usage and orphaned data

-- 1. Clean up orphaned profiles (profiles with null user_id)
DELETE FROM profiles WHERE user_id IS NULL;

-- 2. Ensure profiles table has proper constraints
-- The profiles table should use auto-generated UUIDs for the id field
-- and user_id should reference users.id as foreign key

-- Verify current state after cleanup
SELECT 
    p.id as profile_id,
    p.user_id,
    p.profile_type,
    u.email,
    u.name
FROM profiles p 
LEFT JOIN users u ON p.user_id = u.id 
ORDER BY p.created_at DESC;

-- Check for any remaining data inconsistencies
SELECT 
    'Orphaned Profiles' as issue_type,
    COUNT(*) as count
FROM profiles p 
LEFT JOIN users u ON p.user_id = u.id 
WHERE u.id IS NULL

UNION ALL

SELECT 
    'Total Profiles' as issue_type,
    COUNT(*) as count
FROM profiles

UNION ALL

SELECT 
    'Total Users' as issue_type,
    COUNT(*) as count
FROM users;
