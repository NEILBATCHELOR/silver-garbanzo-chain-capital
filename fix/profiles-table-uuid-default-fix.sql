-- Fix for profiles table missing UUID default
-- Error: "null value in column "id" of relation "profiles" violates not-null constraint"
-- 
-- This migration adds a default UUID generator to the profiles.id column
-- to match the pattern used by other tables in the database.

-- Add default UUID generator to profiles.id column
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public' 
  AND column_name = 'id';
