-- Test User Creation Fix
-- Run this query to test if the user creation fix works properly
-- Date: 2025-08-27

-- Step 1: Verify current clean state
SELECT 'Data consistency check:' as test_step;

SELECT 
    'Orphaned Profiles' as issue_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS' 
        ELSE '❌ FAIL - Run cleanup script first' 
    END as status
FROM profiles p 
LEFT JOIN users u ON p.user_id = u.id 
WHERE u.id IS NULL

UNION ALL

SELECT 
    'Valid Profile-User Links' as issue_type,
    COUNT(*) as count,
    '✅ INFO' as status
FROM profiles p 
INNER JOIN users u ON p.user_id = u.id;

-- Step 2: Show current state of profiles
SELECT 'Current profiles state:' as test_step;

SELECT 
    p.id as profile_id,
    p.user_id,
    p.profile_type,
    u.email,
    u.name as user_name,
    p.created_at as profile_created
FROM profiles p 
LEFT JOIN users u ON p.user_id = u.id 
ORDER BY p.created_at DESC;

-- Step 3: Verify foreign key constraints exist
SELECT 'Constraint verification:' as test_step;

SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name as references_table,
    ccu.column_name as references_column,
    CASE 
        WHEN tc.constraint_name = 'profiles_user_id_fkey' THEN '✅ PASS'
        ELSE '✅ INFO'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('profiles', 'users')
    AND tc.constraint_type IN ('FOREIGN KEY', 'PRIMARY KEY')
ORDER BY tc.table_name, tc.constraint_type;
