-- Direct SQL User Removal Script
-- Use this script in Supabase SQL Editor with service role privileges
-- 
-- Target User: fe5e72af-da55-4f70-8675-d6e9a8548f10 (nbatchelor@lacero.io)
--
-- This script will:
-- 1. Remove user from auth.users (main user record)
-- 2. Cascade delete related auth records (identities, sessions, refresh_tokens)
-- 3. Clean up any public schema references (if any exist)

BEGIN;

-- Step 1: Verify user exists and show details
SELECT 
    'User to be deleted:' as action,
    id, 
    email, 
    created_at, 
    last_sign_in_at,
    email_confirmed_at
FROM auth.users 
WHERE id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10';

-- Step 2: Show related auth records that will be cascade deleted
SELECT 'Auth Identities:' as table_name, COUNT(*) as record_count 
FROM auth.identities 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'Auth Sessions:' as table_name, COUNT(*) as record_count 
FROM auth.sessions 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'Auth Refresh Tokens:' as table_name, COUNT(*) as record_count 
FROM auth.refresh_tokens 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'Auth MFA Factors:' as table_name, COUNT(*) as record_count 
FROM auth.mfa_factors 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10';

-- Step 3: Check for any public schema references (should be 0 based on our analysis)
SELECT 'Public Profiles:' as table_name, COUNT(*) as record_count 
FROM profiles 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'User Roles:' as table_name, COUNT(*) as record_count 
FROM user_roles 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'Audit Logs:' as table_name, COUNT(*) as record_count 
FROM audit_logs 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10';

-- Step 4: Perform the deletion
-- WARNING: This is irreversible. Make sure you want to proceed.

DELETE FROM auth.users 
WHERE id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10';

-- Step 5: Verify deletion was successful
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10')
        THEN '❌ ERROR: User still exists!'
        ELSE '✅ SUCCESS: User has been deleted'
    END as deletion_status;

-- Step 6: Verify cascade deletions worked
SELECT 'Post-deletion Auth Identities:' as table_name, COUNT(*) as remaining_records 
FROM auth.identities 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'Post-deletion Auth Sessions:', COUNT(*) 
FROM auth.sessions 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10'

UNION ALL

SELECT 'Post-deletion Auth Refresh Tokens:', COUNT(*) 
FROM auth.refresh_tokens 
WHERE user_id = 'fe5e72af-da55-4f70-8675-d6e9a8548f10';

COMMIT;

-- Final confirmation
SELECT 'User Removal Complete' as status, NOW() as completed_at;
