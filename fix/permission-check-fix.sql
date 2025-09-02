-- FIX: Update check_user_permission function to handle multiple roles
CREATE OR REPLACE FUNCTION public.check_user_permission(user_id UUID, permission TEXT) 
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  has_permission BOOLEAN := FALSE;
  super_admin_exists BOOLEAN := FALSE;
BEGIN
  -- Check if user has Super Admin role (handles multiple roles)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_permission.user_id
    AND r.name = 'Super Admin'
  ) INTO super_admin_exists;
  
  -- Super Admin has all permissions
  IF super_admin_exists THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission (handles multiple roles)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = check_user_permission.user_id
    AND rp.permission_name = check_user_permission.permission
  ) INTO has_permission;
  
  RETURN has_permission;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in check_user_permission: %', SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.check_user_permission IS 'Check if a user has a specific permission, with support for multiple roles';
