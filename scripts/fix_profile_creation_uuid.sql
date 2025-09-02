-- Fix for Profile Creation UUID Issue
-- This fixes the null value in column "id" of relation "profiles" error

-- Update the handle_new_auth_user trigger function to handle null IDs
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert into profiles table when a new auth user is created
  -- Use NEW.id if available, otherwise generate a new UUID
  INSERT INTO public.profiles (id, user_id)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.id
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger is properly attached to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
