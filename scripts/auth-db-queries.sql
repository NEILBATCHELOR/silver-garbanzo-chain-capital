-- Chain Capital Auth System Database Queries
-- Quick queries to check auth system state and test data

-- 1. Check all users and their status
SELECT 
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL AND last_sign_in_at IS NOT NULL THEN 'Active'
        WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
        ELSE 'Unconfirmed'
    END as status
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Check user roles and permissions
SELECT 
    u.email,
    r.name as role_name,
    r.permissions
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.email;

-- 3. Check MFA factors (if table exists)
-- Note: MFA factors are typically stored in auth.mfa_factors
-- SELECT 
--     u.email,
--     mf.factor_type,
--     mf.status,
--     mf.friendly_name,
--     mf.created_at
-- FROM auth.users u
-- LEFT JOIN auth.mfa_factors mf ON u.id = mf.user_id
-- ORDER BY u.email, mf.created_at;

-- 4. Check recent sign-in activity
SELECT 
    email,
    last_sign_in_at,
    extract(epoch from (now() - last_sign_in_at))/3600 as hours_since_last_signin
FROM auth.users 
WHERE last_sign_in_at IS NOT NULL
ORDER BY last_sign_in_at DESC;

-- 5. Create a test user (if needed)
-- INSERT INTO auth.users (
--     id,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     created_at,
--     updated_at
-- ) VALUES (
--     gen_random_uuid(),
--     'test-manual@chaincapital.test',
--     crypt('TestPassword123!', gen_salt('bf')),
--     now(),
--     now(),
--     now()
-- );

-- 6. Check auth schema tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name IN ('users', 'sessions', 'mfa_factors', 'identities')
ORDER BY table_name, ordinal_position;

-- 7. Check user sessions (active sessions)
SELECT 
    u.email,
    s.created_at as session_created,
    s.updated_at as session_updated,
    extract(epoch from (now() - s.updated_at))/60 as minutes_since_update
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.updated_at > now() - interval '24 hours'
ORDER BY s.updated_at DESC;

-- 8. Check OAuth identities
SELECT 
    u.email,
    i.provider,
    i.provider_id,
    i.created_at
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
ORDER BY u.email, i.provider;
