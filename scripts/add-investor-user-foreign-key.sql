-- Add foreign key constraint between investors.user_id and users.id
-- This will enable Supabase to properly recognize the relationship for automatic joins

-- First, let's check for any orphaned records that might prevent the constraint
-- (This is commented out as it's for informational purposes)
-- SELECT COUNT(*) as orphaned_investors
-- FROM investors i 
-- WHERE i.user_id IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = i.user_id);

-- Add the foreign key constraint
ALTER TABLE investors 
ADD CONSTRAINT fk_investors_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create an index for better query performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);

-- Verify the constraint was added successfully
-- SELECT 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name = 'investors'
--   AND kcu.column_name = 'user_id';
