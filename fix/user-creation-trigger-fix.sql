-- Fix for User Creation Database Error
-- Issue: handle_new_auth_user trigger fails due to FK constraint violation
-- The trigger tries to insert into profiles before public.users exists

-- SOLUTION 1: Modify the trigger function to handle FK constraint gracefully
-- This is the recommended approach as it's the least disruptive

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the public.users record exists before creating profile
  -- If not, skip profile creation - it will be handled later in the application
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Insert into profiles table only if public.users exists
    INSERT INTO public.profiles (id, user_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(), -- Generate unique profile ID
      NEW.id,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING; -- Avoid duplicates
  END IF;
  
  RETURN NEW;
END;
$$;

-- SOLUTION 2: Alternative - Create a deferred constraint version
-- Uncomment this section if you prefer to make the FK constraint deferrable

-- ALTER TABLE public.profiles 
-- DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- ALTER TABLE public.profiles 
-- ADD CONSTRAINT profiles_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES public.users(id) 
-- DEFERRABLE INITIALLY DEFERRED;

-- SOLUTION 3: Alternative - Disable the trigger entirely
-- Uncomment this if you want to handle profile creation entirely in application code

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- VERIFICATION QUERIES:
-- After applying the fix, you can verify with these queries:

-- Check the trigger function:
-- SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'handle_new_auth_user';

-- Check if trigger still exists:
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- Test user creation:
-- Try creating a user through the application interface
