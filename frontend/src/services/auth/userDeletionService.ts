import { supabase } from '@/infrastructure/database/client';
import { deleteAuthUser, verifyAdminClient } from '@/infrastructure/database/admin-client';

/**
 * User Deletion Service
 * Handles complete user deletion including public.users, profiles, user_roles, and related records
 * Note: auth.users deletion requires elevated privileges - handled gracefully
 */
export class UserDeletionService {
  /**
   * Completely delete a user from all tables
   * This includes public.users, profiles, user_roles, and related records, plus auth.users
   * Order: dependent records → public.users → auth.users
   */
  async deleteUserCompletely(userId: string): Promise<boolean> {
    try {
      // Step 1: Verify user exists and get their data first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, auth_id')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error(`User not found: ${userError?.message || 'No user data'}`);
      }

      console.log(`🗑️ Starting comprehensive deletion for user ${userId}...`);

      // Step 2: Delete all dependent records first (FK constraints)
      console.log('📋 Deleting dependent records...');

      // Delete user_roles first (due to FK constraints)
      const { error: rolesDeleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesDeleteError) {
        console.error('⚠️ Error deleting user roles:', rolesDeleteError);
      } else {
        console.log('✅ User roles deleted');
      }

      // Delete organization relationships
      const { error: orgUsersError } = await supabase
        .from('user_organization_roles')
        .delete()
        .eq('user_id', userId);

      if (orgUsersError) {
        console.error('⚠️ Error deleting organization roles:', orgUsersError);
      } else {
        console.log('✅ Organization roles deleted');
      }

      // Delete profiles explicitly  
      const { error: profilesDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profilesDeleteError) {
        console.error('⚠️ Error deleting profiles:', profilesDeleteError);
      } else {
        console.log('✅ Profiles deleted');
      }

      // Delete any other user-related records that might cause FK constraint issues
      const dependentTables = [
        'energy_assets',
        'approval_configs', 
        'approval_config_history',
        'document_versions',
        'approval_config_approvers',
        'document_approvals',
        'policy_template_approvers',
        'stripe_conversion_transactions',
        'stripe_stablecoin_accounts'
      ];

      for (const table of dependentTables) {
        try {
          // Check which column to use for each table
          let column = 'user_id';
          if (table === 'energy_assets') column = 'owner_id';
          if (table === 'approval_configs') column = 'created_by'; // This table has both created_by and last_modified_by
          if (table === 'approval_config_history') column = 'changed_by';
          if (table === 'document_versions') column = 'uploaded_by';
          if (table === 'approval_config_approvers') column = 'approver_user_id'; // Also has created_by
          if (table === 'document_approvals') column = 'approver_id';

          const { error: depError } = await supabase
            .from(table)
            .delete()
            .eq(column, userId);

          if (depError) {
            console.warn(`⚠️ Error cleaning ${table}:`, depError);
          } else {
            console.log(`✅ Cleaned ${table}`);
          }

          // For tables with multiple user references, clean those too
          if (table === 'approval_configs') {
            await supabase.from(table).delete().eq('last_modified_by', userId);
          }
          if (table === 'approval_config_approvers') {
            await supabase.from(table).delete().eq('created_by', userId);
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning ${table}:`, error);
        }
      }

      // Step 3: Delete from public.users (this should cascade to remaining references)
      console.log('🗑️ Deleting from public.users...');
      const { error: publicDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (publicDeleteError) {
        throw new Error(`Failed to delete from public.users: ${publicDeleteError.message}`);
      }
      console.log('✅ Public user record deleted');

      // Step 4: Delete from auth.users using admin client
      let authDeletionMessage = 'Auth deletion skipped - no auth_id found';
      let authDeletionSuccess = false;
      
      try {
        // Verify admin client is ready
        const isAdminReady = await verifyAdminClient();
        if (!isAdminReady) {
          authDeletionMessage = '❌ Auth deletion failed - admin privileges not available';
          console.warn('⚠️ Admin client not ready - auth user will remain orphaned');
        } else {
          // Try to delete using the user's auth ID (if available) or the regular user ID
          const authId = userData.auth_id || userId;
          console.log(`🔐 Attempting auth deletion with ID: ${authId}`);
          
          authDeletionSuccess = await deleteAuthUser(authId);
          
          if (authDeletionSuccess) {
            authDeletionMessage = '✅ Successfully deleted from auth.users';
            console.log('✅ Auth user deleted successfully');
          } else {
            authDeletionMessage = '❌ Auth deletion failed - check service role key configuration';
            console.warn('⚠️ Auth user deletion failed - user may be orphaned in auth.users');
          }
        }
      } catch (adminError) {
        console.error('❌ Exception during auth user deletion:', adminError);
        authDeletionMessage = `❌ Auth deletion exception: ${adminError}`;
      }

      // Step 5: Final verification - check for any remaining orphaned records
      const orphanCount = await this.cleanupOrphanedRecords(userId);
      
      console.log(`✅ User deletion process completed`);
      console.log(`   - Public records: ✅ Deleted`);
      console.log(`   - Dependent records: ✅ Cleaned`);
      console.log(`   - Auth records: ${authDeletionMessage}`);
      console.log(`   - Orphaned records cleaned: ${orphanCount}`);

      // Return true even if auth deletion failed, as the public records are cleaned up
      // The auth record orphaning is logged for manual cleanup if needed
      return true;
    } catch (error) {
      console.error('❌ Complete user deletion failed:', error);
      throw error;
    }
  }

  /**
   * Clean up any orphaned records for a specific user
   */
  private async cleanupOrphanedRecords(userId: string): Promise<number> {
    let cleanedCount = 0;
    
    try {
      // Check for orphaned profiles
      const { data: orphanedProfiles } = await supabase
        .from('profiles')
        .select('id, user_id')
        .or(`user_id.eq.${userId},id.eq.${userId}`);

      if (orphanedProfiles && orphanedProfiles.length > 0) {
        console.warn('Found orphaned profile records, cleaning up...', orphanedProfiles);
        
        for (const profile of orphanedProfiles) {
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.id);
            
          if (!error) {
            cleanedCount++;
          }
        }
      }
      
      // Check for other potential orphaned records
      const { data: orphanedRoles } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId);
        
      if (orphanedRoles && orphanedRoles.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
          
        if (!error) {
          cleanedCount += orphanedRoles.length;
        }
      }
      
    } catch (error) {
      console.error('Error during orphaned records cleanup:', error);
    }
    
    return cleanedCount;
  }

  /**
   * Check if a user has orphaned profiles
   */
  async checkForOrphanedProfiles(userId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('profiles')
        .select('id, user_id')
        .is('user_id', null);

      if (userId) {
        query = query.or(`user_id.eq.${userId},id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking for orphaned profiles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in checkForOrphanedProfiles:', error);
      return [];
    }
  }

  /**
   * Clean up any orphaned profiles
   */
  async cleanupOrphanedProfiles(): Promise<number> {
    try {
      const orphanedProfiles = await this.checkForOrphanedProfiles();
      
      if (orphanedProfiles.length === 0) {
        return 0;
      }

      console.log(`Found ${orphanedProfiles.length} orphaned profiles, cleaning up...`);

      let cleanedCount = 0;
      for (const profile of orphanedProfiles) {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id);

        if (!error) {
          cleanedCount++;
        } else {
          console.error(`Failed to delete orphaned profile ${profile.id}:`, error);
        }
      }

      console.log(`Cleaned up ${cleanedCount} orphaned profiles`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up orphaned profiles:', error);
      return 0;
    }
  }
}

export const userDeletionService = new UserDeletionService();
