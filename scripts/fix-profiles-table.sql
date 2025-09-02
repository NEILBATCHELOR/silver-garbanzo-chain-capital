-- Fix Profiles Table Setup for Chain Capital
-- This script creates a proper profiles table that synchronizes with auth.users and public.users

-- 1. First, add auth_id column to public.users if it doesn't exist
-- This establishes the connection between public.users and auth.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a unique index on auth_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_id_idx ON public.users(auth_id);

-- 2. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  profile_type public.profile_type,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. Create trigger function to handle new auth users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table when a new auth user is created
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger for new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 7. Create trigger function to sync public.users with profiles
CREATE OR REPLACE FUNCTION public.sync_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When public.users is inserted/updated with auth_id, update profiles.user_id
  IF NEW.auth_id IS NOT NULL THEN
    UPDATE public.profiles
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE id = NEW.auth_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers for public.users
DROP TRIGGER IF EXISTS on_public_user_upsert ON public.users;
CREATE TRIGGER on_public_user_upsert
  AFTER INSERT OR UPDATE OF auth_id ON public.users
  FOR EACH ROW
  WHEN (NEW.auth_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_user_to_profile();

-- 9. Create updated_at trigger function for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create updated_at trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Admin function to set profile type (only callable by service role)
CREATE OR REPLACE FUNCTION public.admin_set_profile_type(
  user_auth_id UUID,
  new_profile_type public.profile_type
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    profile_type = new_profile_type,
    updated_at = NOW()
  WHERE id = user_auth_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with auth ID % not found', user_auth_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict execution permissions (only service role can execute)
REVOKE EXECUTE ON FUNCTION public.admin_set_profile_type FROM public, anon, authenticated;

-- 12. Function to get complete user profile (for application use)
CREATE OR REPLACE FUNCTION public.get_user_profile(user_auth_id UUID)
RETURNS TABLE(
  auth_id UUID,
  user_id UUID,
  profile_type public.profile_type,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as auth_id,
    p.user_id,
    p.profile_type,
    p.first_name,
    p.last_name,
    au.email,
    u.name,
    u.status,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.users u ON u.id = p.user_id
  WHERE p.id = user_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile TO authenticated;

-- 13. Create profiles for existing auth users (migration)
INSERT INTO public.profiles (id)
SELECT au.id
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- 14. Sync existing public.users with their auth_id if email matches
-- This is a one-time migration to establish connections
UPDATE public.users pu
SET auth_id = au.id
FROM auth.users au
WHERE pu.email = au.email
  AND pu.auth_id IS NULL;

-- 15. Update profiles.user_id for existing connections
UPDATE public.profiles p
SET user_id = u.id,
    updated_at = NOW()
FROM public.users u
WHERE u.auth_id = p.id
  AND p.user_id IS NULL;

-- 16. Create index for better performance
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_profile_type_idx ON public.profiles(profile_type);

-- 17. Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profiles linking auth.users to public.users with profile types';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id (Supabase auth user)';
COMMENT ON COLUMN public.profiles.user_id IS 'References public.users.id (application user)';
COMMENT ON COLUMN public.profiles.profile_type IS 'User role type in the system';
