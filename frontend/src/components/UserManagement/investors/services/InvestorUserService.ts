import { supabase } from "@/infrastructure/database/client";
import { v4 as uuidv4 } from "uuid";
import { 
  InvestorWithUser, 
  CreateInvestorUserRequest, 
  InvestorInviteRequest,
  BulkInviteRequest,
  BulkInviteProgress 
} from "../types";
import { authService } from "@/services/auth/";

class InvestorUserService {
  /**
   * Get all investors with their user account information
   * Using manual fetching approach to avoid foreign key dependency
   */
  async getAllInvestorsWithUsers(): Promise<InvestorWithUser[]> {
    try {
      // First, get all investors
      const { data: investors, error: investorError } = await supabase
        .from("investors")
        .select(`
          investor_id,
          name,
          email,
          type,
          company,
          kyc_status,
          kyc_expiry_date,
          wallet_address,
          created_at,
          updated_at,
          user_id,
          profile_id,
          profile_type
        `)
        .order("name", { ascending: true });

      if (investorError) throw investorError;

      if (!investors || investors.length === 0) {
        return [];
      }

      // Get unique user IDs that are not null
      const userIds = [...new Set(
        investors
          .filter(inv => inv.user_id)
          .map(inv => inv.user_id)
      )];

      // Get unique profile IDs that are not null
      const profileIds = [...new Set(
        investors
          .filter(inv => inv.profile_id)
          .map(inv => inv.profile_id)
      )];

      // Fetch users if there are any user IDs
      let users: any[] = [];
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select(`
            id,
            email,
            name,
            status,
            created_at,
            updated_at
          `)
          .in("id", userIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
          // Don't throw, just continue without user data
        } else {
          users = usersData || [];
        }
      }

      // Fetch profiles if there are any profile IDs
      let profiles: any[] = [];
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            id,
            user_id,
            profile_type,
            created_at,
            updated_at
          `)
          .in("id", profileIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          // Don't throw, just continue without profile data
        } else {
          profiles = profilesData || [];
        }
      }

      // Create lookup maps for better performance
      const userMap = new Map(users.map(user => [user.id, user]));
      const profileMap = new Map(profiles.map(profile => [profile.id, profile]));

      // Combine the data
      return investors.map(investor => ({
        investor_id: investor.investor_id,
        name: investor.name,
        email: investor.email,
        type: investor.type,
        company: investor.company,
        kyc_status: investor.kyc_status,
        kyc_expiry_date: investor.kyc_expiry_date,
        wallet_address: investor.wallet_address,
        created_at: investor.created_at,
        updated_at: investor.updated_at,
        user_id: investor.user_id,
        profile_id: investor.profile_id,
        profile_type: investor.profile_type,
        user: investor.user_id ? userMap.get(investor.user_id) || null : null,
        profile: investor.profile_id ? profileMap.get(investor.profile_id) || null : null,
      })) as InvestorWithUser[];

    } catch (error) {
      console.error("Error fetching investors with users:", error);
      throw error;
    }
  }

  /**
   * Get a specific investor with user account information
   */
  async getInvestorWithUser(investorId: string): Promise<InvestorWithUser | null> {
    try {
      // Get the investor
      const { data: investor, error: investorError } = await supabase
        .from("investors")
        .select(`
          investor_id,
          name,
          email,
          type,
          company,
          kyc_status,
          kyc_expiry_date,
          wallet_address,
          created_at,
          updated_at,
          user_id,
          profile_id,
          profile_type
        `)
        .eq("investor_id", investorId)
        .single();

      if (investorError) throw investorError;
      if (!investor) return null;

      // Fetch user if user_id exists
      let user = null;
      if (investor.user_id) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(`
            id,
            email,
            name,
            status,
            created_at,
            updated_at
          `)
          .eq("id", investor.user_id)
          .single();

        if (userError) {
          console.error("Error fetching user for investor:", userError);
          // Don't throw, just continue without user data
        } else {
          user = userData;
        }
      }

      // Fetch profile if profile_id exists
      let profile = null;
      if (investor.profile_id) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(`
            id,
            user_id,
            profile_type,
            created_at,
            updated_at
          `)
          .eq("id", investor.profile_id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for investor:", profileError);
          // Don't throw, just continue without profile data
        } else {
          profile = profileData;
        }
      }

      return {
        investor_id: investor.investor_id,
        name: investor.name,
        email: investor.email,
        type: investor.type,
        company: investor.company,
        kyc_status: investor.kyc_status,
        kyc_expiry_date: investor.kyc_expiry_date,
        wallet_address: investor.wallet_address,
        created_at: investor.created_at,
        updated_at: investor.updated_at,
        user_id: investor.user_id,
        profile_id: investor.profile_id,
        profile_type: investor.profile_type,
        user,
        profile,
      } as InvestorWithUser;

    } catch (error) {
      console.error("Error fetching investor with user:", error);
      throw error;
    }
  }

  /**
   * Get the default investor role ID
   */
  private async getInvestorRoleId(): Promise<string> {
    // Always use the specific investor role ID as requested
    return 'dd584338-805e-4bd9-aaa6-43fd2a4fca80';
  }

  /**
   * Create a user account for an investor
   */
  async createUserAccountForInvestor(request: CreateInvestorUserRequest): Promise<InvestorWithUser> {
    try {
      // Get investor role ID
      const roleId = request.roleId || await this.getInvestorRoleId();
      
      // Generate a secure temporary password if not provided
      const password = request.password || this.generateSecurePassword();
      
      console.log(`Creating user account for investor ${request.investorId} with email ${request.email}`);
      
      // First check if a user with this email already exists in auth system
      const { data: existingUsers } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", request.email)
        .limit(1);
      
      let user;
      
      if (existingUsers && existingUsers.length > 0) {
        console.log(`User with email ${request.email} already exists, linking to investor instead of creating new account`);
        user = existingUsers[0];
        
        // Get existing profile or create one if it doesn't exist
        let profile;
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .limit(1)
          .single();
          
        if (existingProfile) {
          profile = existingProfile;
          console.log(`Using existing profile for user ${user.id}`);
        } else {
          // Create a profile for the existing user
          const { data: newProfile, error: profileCreateError } = await supabase
            .from("profiles")
            .insert({
              id: user.id, // Use the user's ID as the profile ID to avoid FK constraint issues
              user_id: user.id,
              profile_type: 'investor',
            })
            .select()
            .single();
            
          if (profileCreateError) {
            console.error("Error creating profile for existing user:", profileCreateError);
            throw profileCreateError;
          }
          
          profile = newProfile;
          console.log(`Created new profile for existing user ${user.id}`);
        }
        
        // Create user_roles record if it doesn't exist
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", user.id)
          .eq("role_id", roleId)
          .single();
          
        if (!existingRole) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: user.id,
              role_id: roleId,
            });
            
          if (roleError) {
            console.error("Error creating user role:", roleError);
            // Continue despite role error - we can fix this later
          } else {
            console.log(`Created investor role assignment for user ${user.id}`);
          }
        }
        
        // Update the investor record with existing user and profile IDs
        const { data: updatedInvestor, error: updateError } = await supabase
          .from("investors")
          .update({
            user_id: user.id,
            profile_id: profile.id,
            profile_type: 'investor',
            updated_at: new Date().toISOString(),
          })
          .eq("investor_id", request.investorId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating investor with existing user info:", updateError);
          throw updateError;
        }
        
        // Return the updated investor with user information
        return await this.getInvestorWithUser(request.investorId) as InvestorWithUser;
      } else {
        // No existing user, create a new one using the enhanced service.
        // This service handles creation of auth user, public user, profile, and user role in the correct sequence.
        user = await authService.createUser({
          email: request.email,
          name: request.name,
          password,
          roleId,
          profileType: 'investor',
          sendInvite: request.sendInvite || false,
        });

        if (!user || !user.id || !user.profile?.id) {
          throw new Error("Failed to create user account or retrieve necessary IDs.");
        }

        console.log(`Successfully created user with ID: ${user.id} and profile ID: ${user.profile.id}`);

        // Update the investor record with the new user and profile IDs
        const { error: updateError } = await supabase
          .from("investors")
          .update({
            user_id: user.id,
            profile_id: user.profile.id,
            profile_type: 'investor',
            updated_at: new Date().toISOString(),
          })
          .eq("investor_id", request.investorId);

        if (updateError) {
          console.error("Error updating investor with new user info:", updateError);
          // We don't delete the user here to avoid data loss. The link can be fixed manually.
          throw updateError;
        }

        // Return the updated investor with all related user information
        return await this.getInvestorWithUser(request.investorId) as InvestorWithUser;
      }
    } catch (error) {
      console.error("Error creating user account for investor:", error);
      throw error;
    }
  }

  /**
   * Send or resend an invite to an investor user
   */
  async sendInvestorInvite(request: InvestorInviteRequest): Promise<boolean> {
    try {
      // Use Supabase auth to generate and send an invitation
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: request.email,
        data: {
          name: request.name,
          profileType: 'investor',
          investorId: request.investorId,
        },
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        console.error("Error generating invitation link:", error);
        throw error;
      }

      console.log("Invitation sent successfully for investor:", request.investorId);
      return true;
    } catch (error) {
      console.error("Error sending investor invite:", error);
      throw error;
    }
  }

  /**
   * Send bulk invites to multiple investors with delay
   */
  async sendBulkInvites(
    request: BulkInviteRequest,
    progressCallback?: (progress: BulkInviteProgress) => void
  ): Promise<BulkInviteProgress> {
    const delaySeconds = request.delaySeconds || 5;
    const progress: BulkInviteProgress = {
      total: request.investorIds.length,
      completed: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < request.investorIds.length; i++) {
      const investorId = request.investorIds[i];
      
      try {
        // Get investor details
        const investor = await this.getInvestorWithUser(investorId);
        if (!investor || !investor.user_id) {
          throw new Error("Investor does not have a user account");
        }

        progress.current = investor.name;
        progressCallback?.(progress);

        // Send invite
        await this.sendInvestorInvite({
          investorId,
          userId: investor.user_id,
          email: investor.email,
          name: investor.name,
        });

        progress.completed++;
      } catch (error) {
        progress.failed++;
        const investor = await this.getInvestorWithUser(investorId);
        progress.errors.push({
          investorId,
          investorName: investor?.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      progressCallback?.(progress);

      // Add delay between sends (except for the last one)
      if (i < request.investorIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }

    progress.current = undefined;
    return progress;
  }

  /**
   * Generate a secure temporary password
   */
  private generateSecurePassword(): string {
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
  }
}

export const investorUserService = new InvestorUserService();
