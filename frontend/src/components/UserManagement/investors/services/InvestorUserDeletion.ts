import { supabase } from '@/infrastructure/database/client';
import { serviceRoleClient } from '@/infrastructure/database/service-role/service-role-client';
import { authService } from '@/services/auth';

/**
 * Service to handle complete deletion of investor user accounts
 */
export class InvestorUserDeletionService {
  /**
   * Delete an investor user account completely from all tables
   * This handles removing the user association without deleting the investor
   */
  async unlinkInvestorUser(investorId: string): Promise<boolean> {
    try {
      console.log(`Starting investor user unlinking for ${investorId}`);
      
      // Get the investor record to retrieve user_id and profile_id
      const { data: investor, error: investorError } = await supabase
        .from("investors")
        .select("user_id, profile_id, profile_type")
        .eq("investor_id", investorId)
        .single();
        
      if (investorError) {
        console.error(`Error fetching investor ${investorId}:`, investorError);
        throw investorError;
      }
      
      if (!investor || !investor.user_id) {
        console.warn(`No user associated with investor ${investorId}`);
        return false;
      }
      
      // Update the investor record to remove user association
      const { error: updateError } = await supabase
        .from("investors")
        .update({
          user_id: null,
          profile_id: null,
          profile_type: null,
          updated_at: new Date().toISOString(),
        })
        .eq("investor_id", investorId);
        
      if (updateError) {
        console.error(`Error updating investor ${investorId}:`, updateError);
        throw updateError;
      }
      
      console.log(`Successfully unlinked user from investor ${investorId}`);
      return true;
    } catch (error) {
      console.error(`Error unlinking investor user ${investorId}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an investor user account completely from all tables
   * This deletes the user and all associated records
   */
  async deleteInvestorUserCompletely(investorId: string): Promise<boolean> {
    try {
      console.log(`Starting complete investor user deletion for ${investorId}`);
      
      // Get the investor record to retrieve user_id and profile_id
      const { data: investor, error: investorError } = await supabase
        .from("investors")
        .select("user_id, profile_id, profile_type")
        .eq("investor_id", investorId)
        .single();
        
      if (investorError) {
        console.error(`Error fetching investor ${investorId}:`, investorError);
        throw investorError;
      }
      
      if (!investor || !investor.user_id) {
        console.warn(`No user associated with investor ${investorId}`);
        return false;
      }
      
      const userId = investor.user_id;
      const profileId = investor.profile_id;
      
      // Step 1: Update the investor record to remove user association
      // We do this first to prevent orphaned references if later steps fail
      const { error: updateError } = await supabase
        .from("investors")
        .update({
          user_id: null,
          profile_id: null,
          profile_type: null,
          updated_at: new Date().toISOString(),
        })
        .eq("investor_id", investorId);
        
      if (updateError) {
        console.error(`Error updating investor ${investorId}:`, updateError);
        throw updateError;
      }
      
      // Step 2: Delete in reverse order of dependencies
      
      // Delete user roles
      const { error: rolesError } = await serviceRoleClient.database
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
        
      if (rolesError) {
        console.error(`Error deleting roles for user ${userId}:`, rolesError);
        // Continue with deletion anyway
      }
      
      // Delete profile
      if (profileId) {
        const { error: profileError } = await serviceRoleClient.database
          .from("profiles")
          .delete()
          .eq("id", profileId);
          
        if (profileError) {
          console.error(`Error deleting profile ${profileId}:`, profileError);
          // Continue with deletion anyway
        }
      } else {
        // Delete profile by user_id if profile_id is not available
        const { error: profileError } = await serviceRoleClient.database
          .from("profiles")
          .delete()
          .eq("user_id", userId);
          
        if (profileError) {
          console.error(`Error deleting profile for user ${userId}:`, profileError);
          // Continue with deletion anyway
        }
      }
      
      // Delete user from public.users
      const { error: userError } = await serviceRoleClient.database
        .from("users")
        .delete()
        .eq("id", userId);
        
      if (userError) {
        console.error(`Error deleting user ${userId}:`, userError);
        // Continue with deletion anyway
      }
      
      // Delete user from auth.users
      const { error: authError } = await serviceRoleClient.deleteAuthUser(userId);
      
      if (authError) {
        console.error(`Error deleting auth user ${userId}:`, authError);
        // Continue with deletion anyway
      }
      
      console.log(`Successfully deleted user account for investor ${investorId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting investor user ${investorId}:`, error);
      throw error;
    }
  }
}

export const investorUserDeletionService = new InvestorUserDeletionService();