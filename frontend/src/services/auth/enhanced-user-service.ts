import { serviceRoleClient } from '@/infrastructure/database/service-role/service-role-client';
import { supabase } from '@/infrastructure/database/client';
import { User, UserRole } from '@/types/core/centralModels';
import { normalizeRole } from '@/utils/auth/roleUtils';
import { v4 as uuidv4 } from 'uuid';

// Define UserStatus enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

interface CreateUserData {
  email: string;
  name: string;
  password: string;
  roleId: string;
  profileType?: string;
  sendInvite?: boolean;
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

const executeWithRetry = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3,
  delay: number = 1000,
  operationName: string = 'operation'
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLastAttempt) {
        console.error(`${operationName} failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      console.warn(`${operationName} failed, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next retry
      delay *= 1.5;
    }
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded for ${operationName}`);
};

/**
 * Enhanced User Service with Service Role Support
 * 
 * This service uses the service role for user creation to avoid database constraint
 * issues and ensure proper order of operations.
 */
export const enhancedUserService = {
  /**
   * Create a new user using service role for elevated privileges
   * This approach creates users in the correct order to satisfy foreign key constraints
   */
  async createUser(userData: CreateUserData): Promise<User | null> {
    let authUserId: string | null = null;
    let profileId: string | null = null;
    
    try {
      console.log(`Starting enhanced user creation for ${userData.email}`);
      
      // Check if user already exists in auth.users or public.users
      // This is to prevent duplicate user creation
      const { data: existingAuthUsers, error: authCheckError } = await serviceRoleClient.listAuthUsers();

      // Filter the results manually for the specific email
      const matchingUsers = existingAuthUsers?.users?.filter((user: any) => 
        user.email === userData.email
      ) || [];
        
      if (authCheckError) {
        console.error("Error checking for existing auth user:", authCheckError);
      }
      
      if (matchingUsers.length > 0) {
        console.log(`User with email ${userData.email} already exists in auth system, id: ${matchingUsers[0].id}`);
        
        // Check if user exists in public.users
        const { data: existingPublicUsers, error: publicCheckError } = await serviceRoleClient.database
          .from("users")
          .select("id, email")
          .eq("email", userData.email)
          .limit(1);
          
        if (publicCheckError) {
          console.error("Error checking for existing public user:", publicCheckError);
        }
        
        if (existingPublicUsers && existingPublicUsers.length > 0) {
          // User exists in both auth and public system
          authUserId = existingPublicUsers[0].id;
          
          // Continue to update/assign role and profile - don't throw an error
          console.log(`Using existing user account: ${authUserId}`);
        } else {
          // User exists in auth but not in public.users
          // We can create the public.users record
          authUserId = matchingUsers[0].id;
          console.log(`Auth user exists but public user doesn't. Creating public user record for ${authUserId}`);
        }
      } else {
        // User doesn't exist in auth system, check public system as a double-check
        const { data: existingPublicUsers, error: checkError } = await serviceRoleClient.database
          .from("users")
          .select("id, email")
          .eq("email", userData.email)
          .limit(1);
          
        if (checkError) {
          console.error("Error checking for existing public user:", checkError);
        }
        
        if (existingPublicUsers && existingPublicUsers.length > 0) {
          console.log(`User with email ${userData.email} exists in public.users but not auth.users. This is inconsistent.`);
          // In this case, we should either fix the inconsistency or throw an error
          throw new Error(`Inconsistent user state for ${userData.email}. Please contact support.`);
        }
        
        // Step 1: Create user in auth.users and handle trigger constraint violations gracefully
        try {
          const { data: authResponse, error: authError } = await executeWithRetry(
            async () => {
              return await serviceRoleClient.createAuthUser({
                email: userData.email,
                password: userData.password || this.generateSecurePassword(),
                user_metadata: {
                  name: userData.name,
                },
                email_confirm: !userData.sendInvite, // Auto-confirm if not sending invite
              });
            },
            3,
            1000,
            'auth user creation'
          );

          if (authError) {
            console.error("Error creating auth user:", authError);
            throw authError;
          }
          
          if (!authResponse.user) {
            throw new Error("Failed to create user in auth.users");
          }

          authUserId = authResponse.user.id; // Assign to outer scope variable
          console.log(`Auth user created successfully: ${authUserId}`);
          
        } catch (error: any) {
          // If we get a database constraint error, it's likely due to the trigger
          // trying to insert into profiles before public.users exists
          if (error.message?.includes('Database error') && error.message?.includes('creating new user')) {
            console.log('Auth user creation failed due to trigger constraint issue');
            console.log('This is a known issue with the handle_new_auth_user trigger');
            console.log('The trigger tries to create a profile before public.users exists');
            
            // For now, we need to inform the user that there's a database configuration issue
            throw new Error('Database configuration issue: The auth trigger has a foreign key constraint problem. Please contact your administrator to fix the handle_new_auth_user trigger function.');
          }
          
          // Re-throw other errors as-is
          throw error;
        }
      }

      // If we've reached here, we either have an existing user or just created one
      // Now let's ensure the public.users record exists
      let publicUserExists = false;
      
      if (authUserId) {
        const { data: checkPublicUser } = await serviceRoleClient.database
          .from("users")
          .select("id")
          .eq("id", authUserId)
          .single();
          
        publicUserExists = !!checkPublicUser;
      }
      
      if (!publicUserExists) {
        // Step 2: Create public.users record using service role
        await executeWithRetry(
          async () => {
            console.log(`Creating public.users record for ${authUserId}`);
            
            const { error: userError } = await serviceRoleClient.database
              .from("users")
              .insert({
                id: authUserId!, // Primary key = auth user ID
                auth_id: authUserId!, // Foreign key to auth.users.id
                email: userData.email,
                name: userData.name,
                status: userData.sendInvite ? "pending" : "active",
              });

            if (userError) {
              console.error("Error creating public.users record:", userError);
              throw userError;
            }
            
            console.log(`Public user record created successfully for ${authUserId}`);
            return true;
          },
          3,
          1000,
          'public user creation'
        );
      } else {
        // Update existing user if needed
        await executeWithRetry(
          async () => {
            console.log(`Updating public.users record for ${authUserId}`);
            
            const { error: userError } = await serviceRoleClient.database
              .from("users")
              .update({
                name: userData.name,
                updated_at: new Date().toISOString()
              })
              .eq("id", authUserId!);

            if (userError) {
              console.error("Error updating public.users record:", userError);
              throw userError;
            }
            
            console.log(`Public user record updated successfully for ${authUserId}`);
            return true;
          },
          3,
          1000,
          'public user update'
        );
      }

      // Step 3: Handle profile creation/update
      if (userData.profileType) {
        // Check if profile exists
        const { data: existingProfile } = await serviceRoleClient.database
          .from("profiles")
          .select("id, profile_type")
          .eq("user_id", authUserId!)
          .single();
          
        if (existingProfile) {
          profileId = existingProfile.id;
          
          // Update if profile type is different
          if (existingProfile.profile_type !== userData.profileType) {
            await executeWithRetry(
              async () => {
                console.log(`Updating profile type to ${userData.profileType} for user ${authUserId}`);
                
                const { error: profileError } = await serviceRoleClient.database
                  .from("profiles")
                  .update({
                    profile_type: userData.profileType!,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", profileId!);

                if (profileError) {
                  console.error("Error updating profile:", profileError);
                  throw profileError;
                }
                
                console.log(`Profile updated successfully for user ${authUserId}`);
                return true;
              },
              3,
              1000,
              'profile update'
            );
          }
        } else {
          // Create profile if it doesn't exist
          await executeWithRetry(
            async () => {
              console.log(`Creating profile with type ${userData.profileType} for user ${authUserId}`);
              
              const { data: profileData, error: profileError } = await serviceRoleClient.database
                .from("profiles")
                .insert({
                  id: authUserId!, // Use the user's ID as the profile ID to satisfy the foreign key
                  user_id: authUserId!,
                  profile_type: userData.profileType!,
                })
                .select()
                .single();

              if (profileError) {
                console.error("Error creating profile:", profileError);
                throw profileError;
              }
              
              if (profileData) {
                profileId = profileData.id;
              }
              
              console.log(`Profile created successfully for user ${authUserId} with ID ${profileId}`);
              return true;
            },
            3,
            1000,
            'profile creation'
          );
        }
      }

      // Step 4: Assign role to user if needed
      // Check if role already assigned
      const { data: existingRole } = await serviceRoleClient.database
        .from("user_roles")
        .select("role_id")
        .eq("user_id", authUserId!)
        .eq("role_id", userData.roleId)
        .single();
        
      if (!existingRole) {
        await executeWithRetry(
          async () => {
            console.log(`Assigning role ${userData.roleId} to user ${authUserId}`);
            
            // Delete any existing roles first (ensures only one role per user)
            await serviceRoleClient.database
              .from("user_roles")
              .delete()
              .eq("user_id", authUserId!);
            
            // Insert the new role
            const { error: roleError } = await serviceRoleClient.database
              .from("user_roles")
              .insert({
                user_id: authUserId!,
                role_id: userData.roleId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (roleError) {
              console.error("Error assigning role:", roleError);
              throw roleError;
            }
            
            console.log(`Role assigned successfully to user ${authUserId}`);
            return true;
          },
          3,
          1000,
          'role assignment'
        );
      }

      // Step 5: Handle invitation if needed
      if (userData.sendInvite) {
        try {
          await executeWithRetry(
            async () => {
              const { data: linkData, error: linkError } = await serviceRoleClient.generateInviteLink({
                email: userData.email,
                data: {
                  name: userData.name,
                  profileType: userData.profileType || null,
                },
                redirectTo: `${window.location.origin}/auth/callback`,
              });

              if (linkError) {
                throw linkError;
              }

              console.log("Invitation link generated successfully");
              return linkData;
            },
            2,
            2000,
            'invitation generation'
          );
        } catch (inviteError) {
          console.error("Error sending invitation:", inviteError);
          // Don't fail the entire user creation for invitation errors
        }
      }

      // Step 6: Return the created/updated user
      console.log(`Enhanced user creation/update completed successfully for ${userData.email}`);
      return await this.getUserById(authUserId);
      
    } catch (error: any) {
      console.error(`Error in enhanced user creation for ${userData.email}:`, error);
      
      // Only clean up if this was a new user that failed
      if (authUserId && error.message?.includes('creation')) {
        console.warn(`User creation failed. Attempting cleanup for user ${authUserId}`);
        
        try {
          // Clean up in reverse order of dependencies
          // 1. Clean up user roles
          await serviceRoleClient.database
            .from("user_roles")
            .delete()
            .eq("user_id", authUserId);
            
          // 2. Clean up profiles record
          if (profileId) {
            await serviceRoleClient.database
              .from("profiles")
              .delete()
              .eq("id", profileId);
          } else {
            await serviceRoleClient.database
              .from("profiles")
              .delete()
              .eq("user_id", authUserId);
          }
            
          // 3. Clean up public.users record
          await serviceRoleClient.database
            .from("users")
            .delete()
            .eq("id", authUserId);
            
          // 4. Clean up auth user
          await serviceRoleClient.deleteAuthUser(authUserId);
          
          console.log(`Cleanup completed for failed user creation ${authUserId}`);
        } catch (cleanupError) {
          console.error(`Error during cleanup for user ${authUserId}:`, cleanupError);
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Generate a secure temporary password
   */
  generateSecurePassword(): string {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // uppercase
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // lowercase
    password += "0123456789"[Math.floor(Math.random() * 10)]; // number
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // special
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },

  /**
   * Get a user by ID with enhanced error handling
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        throw profileError;
      }
      
      if (!profile) return null;

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("profile_type")
        .eq("user_id", userId)
        .single();

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
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

      let userRoleEnum: UserRole = UserRole.USER;
      let primaryRole = null;

      if (!rolesError && userRoles && userRoles.length > 0) {
        const firstRole = userRoles[0] as any;
        if (firstRole.roles) {
          primaryRole = {
            id: firstRole.role_id,
            name: normalizeRole(firstRole.roles.name),
            description: firstRole.roles.description || '',
            priority: firstRole.roles.priority || 0
          };

          const roleName = firstRole.roles.name?.toLowerCase() || '';
          if (roleName.includes('admin')) {
            userRoleEnum = UserRole.ADMIN;
          } else if (roleName.includes('investor')) {
            userRoleEnum = UserRole.INVESTOR;
          }
        }
      }

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

      // Add extra properties for compatibility
      const userWithExtras = {
        ...userModel,
        profile: {
          ...profile,
          profile_type: profileData?.profile_type || null
        },
        primaryRole,
        allRoles: userRoles?.map((entry: any) => ({
          id: entry.role_id,
          name: normalizeRole(entry.roles?.name || ''),
          description: entry.roles?.description || '',
          priority: entry.roles?.priority || 0
        })) || []
      };

      return userWithExtras as User;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return null;
    }
  },

  /**
   * Delete a user completely using service role
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log(`Starting complete user deletion for ${userId}`);

      // Delete in reverse order to satisfy foreign key constraints
      
      // 1. Delete user roles
      await serviceRoleClient.database
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // 2. Delete profiles
      await serviceRoleClient.database
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      // 3. Delete public users record
      await serviceRoleClient.database
        .from("users")
        .delete()
        .eq("id", userId);

      // 4. Delete auth user (this will cascade to other auth-related tables)
      const { error: authDeleteError } = await serviceRoleClient.deleteAuthUser(userId);
      
      if (authDeleteError) {
        console.error("Error deleting auth user:", authDeleteError);
        // Don't throw here as the public tables are already cleaned up
      }

      console.log(`User ${userId} deleted successfully`);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
};
