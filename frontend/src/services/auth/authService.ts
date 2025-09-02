import { supabase } from '@/infrastructure/database/client';
import {
  signUp,
  getSession,
  signOut,
  resetPasswordForEmail
} from '@/infrastructure/auth/authClient';
import { User, UserRole } from '@/types/core/centralModels';
import { normalizeRole } from '@/utils/auth/roleUtils';
import { userDeletionService } from './userDeletionService';
import { enhancedUserService } from './enhanced-user-service';

// Define UserStatus enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

// Add type definitions for the database responses
interface UserRoleWithRole {
  user_id: string;
  role_id: string;
  roles: {
    id: string;
    name: string;
    description: string;
    priority: number;
  };
}

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  roleId: string;
  profileType?: string;
  sendInvite?: boolean;
}

interface UpdateUserData {
  email?: string;
  data?: {
    name?: string;
    roleId?: string;
    profileType?: string;
  };
  status?: UserStatus;
}

// Utility functions
const toUserStatus = (status: string): UserStatus => {
  if (!status) return UserStatus.ACTIVE;
  
  const statusLower = status.toLowerCase();
  if (statusLower === 'active') return UserStatus.ACTIVE;
  if (statusLower === 'inactive') return UserStatus.INACTIVE;
  if (statusLower === 'pending') return UserStatus.PENDING;
  if (statusLower === 'suspended') return UserStatus.SUSPENDED;
  
  return UserStatus.ACTIVE;
};

const isUserStatus = (status: any): status is UserStatus => {
  return Object.values(UserStatus).includes(status);
};

const validateUser = (user: any): boolean => {
  return (
    user &&
    typeof user === 'object' &&
    'id' in user &&
    'email' in user
  );
};

const toUserModel = (userData: any): User => {
  // Convert string role to UserRole enum
  let roleValue: UserRole;
  
  if (userData.role) {
    switch(userData.role.toLowerCase()) {
      case 'admin':
        roleValue = UserRole.ADMIN;
        break;
      case 'investor':
        roleValue = UserRole.INVESTOR;
        break;
      default:
        roleValue = UserRole.USER;
    }
  } else {
    roleValue = UserRole.USER;
  }
  
  return {
    id: userData.id,
    email: userData.email,
    name: userData.name || '',
    role: roleValue,
    status: userData.status || UserStatus.ACTIVE,
    createdAt: userData.created_at || userData.createdAt || new Date().toISOString(),
    updatedAt: userData.updated_at || userData.updatedAt,
    publicKey: userData.public_key || userData.publicKey,
    encryptedPrivateKey: userData.encrypted_private_key || userData.encryptedPrivateKey,
    mfaEnabled: userData.mfa_enabled || userData.mfaEnabled,
    lastLoginAt: userData.last_login_at || userData.lastLoginAt,
    preferences: {}
  };
};

// Enhanced retry mechanism with exponential backoff and FK-specific handling
const executeWithRetryForFK = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number = 5,
  initialDelay: number = 1000,
  operationName: string = 'database operation'
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1;
      
      // Handle foreign key constraint errors with longer delays
      if (error?.code === '23503' && !isLastAttempt) {
        const delay = initialDelay * Math.pow(2, i); // Exponential backoff
        console.warn(`Foreign key constraint error in ${operationName}, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Handle other specific errors
      if (error?.code === '23505' && !isLastAttempt) { // Unique constraint violation
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Unique constraint error in ${operationName}, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isLastAttempt) {
        console.error(`${operationName} failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      // For other errors, use shorter delay
      const delay = Math.min(initialDelay * Math.pow(1.5, i), 5000);
      console.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded for ${operationName}`);
};

// Helper function to verify auth user exists before proceeding
const verifyAuthUserExists = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.warn(`Error verifying auth user ${userId}:`, error);
      return false;
    }
    return !!data.user;
  } catch (error) {
    console.warn(`Error verifying auth user ${userId}:`, error);
    return false;
  }
};

// User auth admin operations
export const authServiceImproved = {
  /**
   * Create a new user using enhanced service role approach
   * This version uses service role to handle database constraints properly
   */
  async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      // Use the enhanced user service which handles all the complex database operations
      return await enhancedUserService.createUser(userData);
    } catch (error: any) {
      console.error(`Error creating user ${userData.email} via enhanced service:`, error);
      throw error;
    }
  },

  /**
   * DEPRECATED: Legacy user creation method
   * This method is kept for reference but should not be used due to database constraint issues
   */
  async createUserLegacy(userData: CreateUserData): Promise<User | null> {
    let authUserId: string | null = null;
    
    try {
      console.log(`Starting user creation for ${userData.email}`);
      
      // Step 1: Create user in auth.users
      // The database trigger 'handle_new_auth_user' will automatically create a profile entry
      const { data: authData, error: signUpError } = await signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          },
          emailRedirectTo: userData.sendInvite 
            ? `${window.location.origin}/auth/reset-password` 
            : undefined
        }
      });

      if (signUpError) {
        console.error("Error during signUp:", signUpError);
        throw signUpError;
      }
      
      if (!authData.user) {
        throw new Error("Failed to create user in auth.users");
      }

      authUserId = authData.user.id;
      console.log(`Auth user created successfully: ${authUserId}`);

      // Step 2: Wait for auth user and database triggers to complete
      // The trigger needs time to create the profile automatically
      await executeWithRetryForFK(
        async () => {
          const exists = await verifyAuthUserExists(authUserId!);
          if (!exists) {
            throw new Error("Auth user not yet available");
          }
          return exists;
        },
        3,
        3000, // Longer delay for trigger processing
        "auth user verification"
      );

      // Step 3: Create the public.users record
      // Follow the pattern: id = auth_id = auth user ID
      const publicUserData = await executeWithRetryForFK(
        async () => {
          console.log(`Creating public.users record for ${authUserId}`);
          const { data, error: userError } = await supabase
            .from("users")
            .insert({
              id: authUserId!,
              auth_id: authUserId!, // Both fields set to the same value (matches existing pattern)
              email: userData.email,
              name: userData.name,
              status: userData.sendInvite ? "pending" : "active",
            })
            .select()
            .single();

          if (userError) {
            console.error("Error creating public.users record:", userError);
            throw userError;
          }
          
          if (!data) {
            throw new Error("No data returned from public.users insert");
          }
          
          console.log(`Public user record created successfully for ${authUserId}`);
          return data;
        },
        5,
        2000,
        "public.users creation"
      );

      // Step 4: Update the auto-created profile with profile_type if specified
      // The 'handle_new_auth_user' trigger already created a profile, we just need to update it
      if (userData.profileType) {
        try {
          await executeWithRetryForFK(
            async () => {
              console.log(`Updating profile with type ${userData.profileType} for user ${authUserId}`);
              
              // First check if profile exists
              const { data: existingProfile, error: checkError } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", authUserId!)
                .single();

              if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw checkError;
              }

              if (existingProfile) {
                // Update existing profile
                const { error: profileUpdateError } = await supabase
                  .from("profiles")
                  .update({
                    profile_type: userData.profileType,
                    updated_at: new Date().toISOString()
                  })
                  .eq("user_id", authUserId!);

                if (profileUpdateError) {
                  throw profileUpdateError;
                }
              } else {
                // Create profile if it doesn't exist (fallback)
                const { error: profileCreateError } = await supabase
                  .from("profiles")
                  .insert({
                    user_id: authUserId!,
                    profile_type: userData.profileType,
                  });

                if (profileCreateError) {
                  throw profileCreateError;
                }
              }
              
              console.log(`Profile updated successfully for user ${authUserId}`);
              return true;
            },
            3,
            1000,
            "profile update"
          );
        } catch (profileError) {
          console.warn("Profile update failed, but continuing:", profileError);
          // Don't throw here, as the user is already created
        }
      }

      // Step 5: Assign role to user
      await executeWithRetryForFK(
        async () => {
          console.log(`Assigning role ${userData.roleId} to user ${authUserId}`);
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: authUserId!,
              role_id: userData.roleId,
            });

          if (roleError) {
            console.error("Error assigning role:", roleError);
            throw roleError;
          }
          
          console.log(`Role assigned successfully to user ${authUserId}`);
          return true;
        },
        5,
        1000,
        "role assignment"
      );

      // Step 6: Handle invitation/password reset
      if (userData.sendInvite) {
        try {
          // Use password reset for invitations (simpler and more reliable)
          await resetPasswordForEmail(userData.email, {
            redirectTo: `${window.location.origin}/auth/reset-password?mode=invite&name=${encodeURIComponent(userData.name)}`,
          });
          console.log("Password reset invitation sent successfully");
        } catch (inviteError) {
          console.error("Error sending invitation:", inviteError);
          // Don't throw here, as the user is already created
        }
      } else {
        // If not sending invite, sign out the newly created user
        try {
          // Get current session to restore after signup
          const { data: { session: currentSession } } = await getSession();
          
          // Sign out the new user
          await signOut();
          
          // If there was a previous session, restore it
          if (currentSession) {
            console.log("Please note: You've created a new user while logged in. You may need to refresh to restore your session.");
          }
        } catch (signOutError) {
          console.error("Error during sign out:", signOutError);
          // Continue anyway
        }
      }

      // Step 7: Return the created user
      console.log(`User creation completed successfully for ${userData.email}`);
      return this.getUserById(authUserId);
      
    } catch (error: any) {
      console.error(`Error creating user ${userData.email}:`, error);
      
      // Enhanced error logging
      console.error("User creation error details:", {
        email: userData.email,
        authUserId,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        stack: error?.stack
      });
      
      // If we have an authUserId but creation failed, the user might be in an inconsistent state
      if (authUserId) {
        console.warn(`User creation failed after auth user was created. Auth user ${authUserId} may need manual cleanup.`);
        
        // Try to clean up the user if public.users creation failed
        try {
          const { data: publicUser } = await supabase
            .from("users")
            .select("id")
            .eq("id", authUserId)
            .single();
            
          if (!publicUser) {
            console.warn(`Auth user ${authUserId} exists but public.users record does not. Consider manual cleanup.`);
          }
        } catch (checkError) {
          console.error("Error checking user consistency:", checkError);
        }
      }
      
      throw error;
    }
  },

  /**
   * Get a user by ID (unchanged but with better error handling)
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      // Fetch user profile with enhanced retry
      const { data: profile, error: profileError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();
          return result;
        },
        3,
        500,
        "user profile fetch"
      );

      if (profileError) throw profileError;
      if (!profile) return null;

      // Fetch profile data including profile_type
      const { data: profileData, error: profileDataError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("profiles")
            .select("profile_type")
            .eq("user_id", userId)
            .single();
          return result;
        },
        3,
        500,
        "profile data fetch"
      );

      // Fetch user roles with enhanced retry
      const { data: userRoles, error: rolesError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("user_roles")
            .select(`
              role_id,
              roles (
                id,
                name,
                description,
                priority
              )
            `)
            .eq("user_id", userId);
          return result;
        },
        3,
        500,
        "user roles fetch"
      );

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        // Return a basic user model without roles
        const userModel = toUserModel({
          id: userId,
          email: profile.email,
          name: profile.name,
          role: null,
          status: profile.status,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          mfa_enabled: profile.mfa_enabled,
          public_key: profile.public_key,
          encrypted_private_key: profile.encrypted_private_key,
          profile_type: profileData?.profile_type || null
        });
        return validateUser(userModel) ? userModel : null;
      }

      // Properly type the user roles response
      const typedUserRoles = userRoles as unknown as UserRoleWithRole[];
      
      // Get primary role (first one)
      const primaryRole = typedUserRoles.length > 0 && typedUserRoles[0].roles
        ? { 
            id: typedUserRoles[0].role_id, 
            name: normalizeRole(typedUserRoles[0].roles.name),
            description: typedUserRoles[0].roles.description || '',
            priority: typedUserRoles[0].roles.priority || 0
          }
        : null;

      // Map the role name to the UserRole enum
      let userRoleEnum: UserRole;
      const roleName = primaryRole?.name?.toLowerCase() || '';
      
      if (roleName.includes('admin')) {
        userRoleEnum = UserRole.ADMIN;
      } else if (roleName.includes('investor')) {
        userRoleEnum = UserRole.INVESTOR;
      } else {
        userRoleEnum = UserRole.USER;
      }

      // Create the user model with the proper role enum
      const userModel: User = {
        id: userId,
        email: profile.email,
        name: profile.name,
        role: userRoleEnum,
        status: toUserStatus(profile.status),
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        publicKey: profile.public_key,
        encryptedPrivateKey: profile.encrypted_private_key,
        mfaEnabled: profile.mfa_enabled,
        lastLoginAt: profile.last_login_at,
        preferences: {}
      };
      
      // Add extra properties expected by the application
      const userWithExtras = {
        ...userModel,
        profile: {
          ...profile,
          profile_type: profileData?.profile_type || null
        },
        primaryRole,
        allRoles: typedUserRoles
          .filter(entry => entry.roles)
          .map(entry => ({ 
            id: entry.role_id, 
            name: normalizeRole(entry.roles.name),
            description: entry.roles.description || '',
            priority: entry.roles.priority || 0
          }))
      };
      
      // Validate the user model before returning
      return validateUser(userWithExtras) ? userWithExtras as User : null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  },

  /**
   * Update a user
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<User | null> {
    try {
      // 1. Update user profile in public.users
      if (userData.email || userData.data?.name || userData.status) {
        const updateData: any = {};
        if (userData.email) updateData.email = userData.email;
        if (userData.data?.name) updateData.name = userData.data.name;
        if (userData.status) updateData.status = userData.status;

        const { error: profileError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", userId);

        if (profileError) throw profileError;

        // Note: We can't update auth.users email from the browser client
        // Email changes would require the user to verify the new email
        if (userData.email) {
          console.log(`Email change for user ${userId} to ${userData.email} will require verification`);
        }
      }

      // 2. Update user role if provided
      if (userData.data?.roleId) {
        // Remove existing roles
        const { error: deleteRoleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (deleteRoleError) throw deleteRoleError;

        // Add new role
        const { error: addRoleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role_id: userData.data.roleId,
          });

        if (addRoleError) throw addRoleError;
      }

      // 3. Update profile_type if provided
      if (userData.data?.profileType !== undefined) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingProfile) {
          // Update existing profile
          const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update({
              profile_type: userData.data.profileType || null,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);

          if (profileUpdateError) throw profileUpdateError;
        } else if (userData.data.profileType) {
          // Create new profile if it doesn't exist and profileType is provided
          const { error: profileCreateError } = await supabase
            .from("profiles")
            .insert({
              user_id: userId,
              profile_type: userData.data.profileType,
            });

          if (profileCreateError) {
            console.error("Error creating profile:", profileCreateError);
          }
        }
      }

      return this.getUserById(userId);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  /**
   * Delete a user completely from all tables using enhanced service
   * This handles deletion from auth.users, public.users, profiles, and related records
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Use the enhanced user service for consistent database operations
      return await enhancedUserService.deleteUser(userId);
    } catch (error) {
      console.error("Error deleting user:", error);
      
      // Fallback to legacy deletion service if enhanced fails
      try {
        console.log("Falling back to legacy deletion service");
        const success = await userDeletionService.deleteUserCompletely(userId);
        
        if (success) {
          console.log(`User ${userId} deleted successfully using fallback method`);
        }
        
        return success;
      } catch (fallbackError) {
        console.error("Fallback deletion also failed:", fallbackError);
        throw error; // Throw the original error, not the fallback error
      }
    }
  },

  /**
   * Reset a user's password
   */
  async resetUserPassword(userId: string, newPassword: string, sendEmail: boolean = true): Promise<void> {
    try {
      // We can only send password reset emails from the browser client
      // We can't directly set passwords without the admin API
      
      // Get the user's email
      const { data: userData } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      if (!userData?.email) throw new Error("User email not found");

      // Send a password reset email
      const { error } = await resetPasswordForEmail(userData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  },

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      // Fetch all users using enhanced retry
      const { data: users, error: usersError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false });
          return result;
        },
        3,
        500,
        "all users fetch"
      );

      if (usersError) throw usersError;
      if (!users) return [];

      // Fetch all profiles with profile_type
      const { data: allProfiles, error: profilesError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("profiles")
            .select("user_id, profile_type");
          return result;
        },
        3,
        500,
        "all profiles fetch"
      );

      // If profiles error, continue without profile types (they'll be null)
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map for quick profile lookup
      const profilesMap = new Map();
      if (allProfiles) {
        allProfiles.forEach(profile => {
          profilesMap.set(profile.user_id, profile);
        });
      }

      // Fetch role data directly using enhanced retry
      const { data: allUserRoles, error: rolesError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("user_roles")
            .select(`
              user_id,
              role_id,
              roles (
                id,
                name,
                description,
                priority
              )
            `);
          return result;
        },
        3,
        500,
        "all user roles fetch"
      );

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        // Return users without roles, but properly mapped to our User model
        return users
          .map(user => {
            const profile = profilesMap.get(user.id);
            return toUserModel({
              id: user.id,
              email: user.email,
              name: user.name,
              status: user.status,
              created_at: user.created_at,
              updated_at: user.updated_at,
              profile_type: profile?.profile_type || null
            });
          })
          .filter(validateUser); // Filter out invalid users
      }

      // Properly type the user roles response
      const typedUserRoles = allUserRoles as unknown as UserRoleWithRole[];

      // Map users with their roles and convert to our User model
      return users
        .map(user => {
          const userRoleEntries = typedUserRoles.filter(r => r.user_id === user.id);
          const profile = profilesMap.get(user.id);
          
          const primaryRole = userRoleEntries.length > 0 && userRoleEntries[0].roles 
            ? { 
                id: userRoleEntries[0].role_id, 
                name: normalizeRole(userRoleEntries[0].roles.name),
                description: userRoleEntries[0].roles.description || '',
                priority: userRoleEntries[0].roles.priority || 0
              }
            : null;
            
          // Map the role name to the UserRole enum
          let userRoleEnum: UserRole;
          const roleName = primaryRole?.name?.toLowerCase() || '';
          
          if (roleName.includes('admin')) {
            userRoleEnum = UserRole.ADMIN;
          } else if (roleName.includes('investor')) {
            userRoleEnum = UserRole.INVESTOR;
          } else {
            userRoleEnum = UserRole.USER;
          }

          // Create a User model with properly mapped fields
          const userModel: User = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: userRoleEnum,
            status: toUserStatus(user.status),
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            publicKey: user.public_key,
            encryptedPrivateKey: user.encrypted_private_key,
            mfaEnabled: user.mfa_enabled,
            lastLoginAt: user.last_login_at,
            preferences: {}
          };
          
          // Add extra properties for compatibility
          const userWithExtras = {
            ...userModel,
            profile: {
              ...user,
              profile_type: profile?.profile_type || null
            },
            primaryRole: primaryRole,
            allRoles: userRoleEntries
              .filter(entry => entry.roles)
              .map(entry => ({ 
                id: entry.role_id, 
                name: normalizeRole(entry.roles.name),
                description: entry.roles.description || '',
                priority: entry.roles.priority || 0
              }))
          };
          
          return userWithExtras as User;
        })
        .filter(validateUser); // Filter out invalid user objects
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  },

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      // Check if user has Super Admin role first
      const { data: roles, error: rolesError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("user_roles")
            .select(`
              roles!inner(name)
            `)
            .eq("user_id", userId);
          return result;
        },
        3,
        500,
        "permission roles check"
      );

      if (rolesError) {
        console.error(`Error checking roles for user ${userId}:`, rolesError);
      } else if (roles && Array.isArray(roles)) {
        // Check if user has Super Admin role
        const isSuperAdmin = roles.some(r => r.roles && r.roles.name === 'Super Admin');
        if (isSuperAdmin) {
          return true; // Super Admin has all permissions
        }
      }

      // If not Super Admin, check specific permission
      const { data: permissions, error: permissionsError } = await executeWithRetryForFK(
        async () => {
          const result = await supabase
            .from("role_permissions")
            .select(`
              permission_name
            `)
            .eq("permission_name", permissionName)
            .in("role_id", 
              supabase
                .from("user_roles")
                .select("role_id")
                .eq("user_id", userId)
            );
          return result;
        },
        3,
        500,
        "specific permission check"
      );

      if (permissionsError) {
        console.error(`Error checking permission ${permissionName} for user ${userId}:`, permissionsError);
        return false;
      }

      return permissions && permissions.length > 0;
    } catch (error) {
      console.error(`Error checking permission ${permissionName} for user ${userId}:`, error);
      return false;
    }
  }
};

// Export alias for backwards compatibility
export const authService = authServiceImproved;
