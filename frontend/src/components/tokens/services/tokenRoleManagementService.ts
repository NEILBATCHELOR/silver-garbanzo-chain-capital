/**
 * Token Role Management Service
 * Handles querying users and their contract roles for role assignment
 * Includes authorization checks to ensure users can only assign roles they have permission for
 */

import { supabase } from '@/infrastructure/database/client';
import { getCurrentUserId } from '@/infrastructure/auth/auth';

export interface ProjectUser {
  userId: string;
  userName: string | null;
  userEmail: string;
  address: string;
  blockchain: string;
  organizationId: string | null;
  organizationName: string | null;
  roleName: string | null;
  isActive: boolean;
}

export interface TokenRoleHolder {
  address: string;
  userName?: string;
  userEmail?: string;
  hasRole: boolean;
}

export interface UserContractRoles {
  userId: string;
  contractRoles: Record<string, string[]>;
}

export interface RoleAuthorizationResult {
  authorized: boolean;
  userRoles: string[];
  reason?: string;
}

export class TokenRoleManagementService {
  private static instance: TokenRoleManagementService;

  private constructor() {}

  static getInstance(): TokenRoleManagementService {
    if (!TokenRoleManagementService.instance) {
      TokenRoleManagementService.instance = new TokenRoleManagementService();
    }
    return TokenRoleManagementService.instance;
  }

  /**
   * Get all users associated with a project who have active addresses
   */
  async getProjectUsers(projectId: string): Promise<ProjectUser[]> {
    // First, get the project to find its organization_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      throw new Error(`Failed to fetch project: ${projectError.message}`);
    }

    if (!project?.organization_id) {
      console.log('Project has no organization_id, returning empty array');
      return [];
    }

    // Get users in the project's organization
    const { data: orgUsers, error: orgError } = await supabase
      .from('user_organization_roles')
      .select(`
        user_id,
        organization_id,
        role_id,
        roles(name),
        organizations(id, name),
        users(name, email)
      `)
      .eq('organization_id', project.organization_id);

    if (orgError) {
      console.error('Error fetching organization users:', orgError);
      throw new Error(`Failed to fetch organization users: ${orgError.message}`);
    }

    if (!orgUsers || orgUsers.length === 0) {
      console.log('No users found for organization');
      return [];
    }

    // Get addresses for these users
    const userIds = orgUsers.map((u: any) => u.user_id);
    
    const { data: addresses, error: addrError } = await supabase
      .from('user_addresses')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (addrError) {
      console.error('Error fetching user addresses:', addrError);
      throw new Error(`Failed to fetch user addresses: ${addrError.message}`);
    }

    if (!addresses || addresses.length === 0) {
      console.log('No active addresses found for users');
      return [];
    }

    // Combine users with their addresses
    return orgUsers.flatMap((user: any) => {
      const userAddresses = addresses.filter((addr: any) => addr.user_id === user.user_id);
      
      return userAddresses.map((addr: any) => ({
        userId: user.user_id,
        userName: user.users?.name || null,
        userEmail: user.users?.email || 'Unknown',
        address: addr.address,
        blockchain: addr.blockchain,
        organizationId: user.organizations?.id || null,
        organizationName: user.organizations?.name || null,
        roleName: user.roles?.name || null,
        isActive: addr.is_active
      }));
    });
  }

  /**
   * Get users by organization (for multi-project scenarios)
   */
  async getOrganizationUsers(organizationId: string): Promise<ProjectUser[]> {
    const { data: orgUsers, error } = await supabase
      .from('user_organization_roles')
      .select(`
        user_id,
        users!inner(
          name,
          email
        ),
        organizations(
          id,
          name
        ),
        roles(
          name
        )
      `)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching organization users:', error);
      throw new Error(`Failed to fetch organization users: ${error.message}`);
    }

    if (!orgUsers) {
      return [];
    }

    // Get addresses for these users
    const userIds = orgUsers.map((u: any) => u.user_id);
    
    const { data: addresses, error: addrError } = await supabase
      .from('user_addresses')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (addrError) {
      console.error('Error fetching user addresses:', addrError);
      throw new Error(`Failed to fetch user addresses: ${addrError.message}`);
    }

    // Combine users with their addresses
    return orgUsers.flatMap((user: any) => {
      const userAddresses = addresses?.filter((addr: any) => addr.user_id === user.user_id) || [];
      
      return userAddresses.map((addr: any) => ({
        userId: user.user_id,
        userName: user.users?.name || null,
        userEmail: user.users?.email || '',
        address: addr.address,
        blockchain: addr.blockchain,
        organizationId: user.organizations?.id || null,
        organizationName: user.organizations?.name || null,
        roleName: user.roles?.name || null,
        isActive: addr.is_active
      }));
    });
  }

  /**
   * Get the current user's contract roles for authorization checks
   * 
   * ONLY checks the Authorization Layer:
   * - user_contract_roles: User-level permissions (what roles user is authorized to manage/assign)
   * 
   * The Execution Layer (user_addresses) only defines which addresses to use for on-chain execution.
   * It does NOT affect authorization - a user can manage roles based solely on their user_contract_roles.
   * 
   * Handles TWO formats:
   * 1. Flat array: ["ADMIN_ROLE", "MINTER_ROLE"] (legacy/global roles)
   * 2. Object: { "0x123...": ["MINTER_ROLE"], "0x456...": ["PAUSER_ROLE"] } (per-contract roles)
   * 
   * @param userId - The user ID to query
   * @param contractAddress - Optional specific contract address to filter by
   * @returns Array of role strings the user has permission to manage
   */
  async getCurrentUserContractRoles(
    userId: string,
    contractAddress?: string
  ): Promise<string[]> {
    // Check user_contract_roles (Authorization Layer ONLY)
    // This defines what roles the USER is permitted to manage/assign
    const { data: contractRolesData, error: contractRolesError } = await supabase
      .from('user_contract_roles')
      .select('contract_roles')
      .eq('user_id', userId)
      .maybeSingle();

    if (contractRolesError && contractRolesError.code !== 'PGRST116') {
      console.error('Error fetching user contract roles:', contractRolesError);
      return [];
    }

    if (!contractRolesData?.contract_roles) {
      return [];
    }

    const allRoles: string[] = [];

    // Handle FLAT ARRAY format: ["ADMIN_ROLE", "MINTER_ROLE"]
    // This means user has these roles globally (for all contracts)
    if (Array.isArray(contractRolesData.contract_roles)) {
      allRoles.push(...contractRolesData.contract_roles);
    }
    // Handle OBJECT format: { "0x123...": ["MINTER_ROLE"], "0x456...": ["PAUSER_ROLE"] }
    // This means user has specific roles per contract
    else if (typeof contractRolesData.contract_roles === 'object') {
      if (!contractAddress) {
        // Return all roles across all contracts
        Object.values(contractRolesData.contract_roles).forEach((roles: any) => {
          if (Array.isArray(roles)) {
            allRoles.push(...roles);
          }
        });
      } else {
        // Return roles for specific contract
        const contractRoles = contractRolesData.contract_roles[contractAddress];
        if (Array.isArray(contractRoles)) {
          allRoles.push(...contractRoles);
        }
      }
    }

    // Normalize role names: convert to lowercase for comparison
    // Also handle both formats: "MINTER_ROLE" and "minter"
    const normalizedRoles = allRoles.map(role => {
      const lower = role.toLowerCase();
      // Remove _ROLE suffix if present
      return lower.endsWith('_role') ? lower.replace('_role', '') : lower;
    });

    // Return unique roles
    return [...new Set(normalizedRoles)];
  }

  /**
   * Check if current user can assign a specific role
   * Authorization logic:
   * - User must have 'admin' or 'default_admin' role globally, OR
   * - User must have 'owner' role globally, OR
   * - User must have 'role_manager' for the specific contract, OR
   * - User must have the specific role they're trying to assign
   * 
   * @param currentUserId - ID of user attempting to assign the role
   * @param contractAddress - The contract address
   * @param roleToAssign - The role being assigned (normalized: lowercase, no _ROLE suffix)
   * @returns Authorization result with details
   */
  async canAssignRole(
    currentUserId: string,
    contractAddress: string,
    roleToAssign: string
  ): Promise<RoleAuthorizationResult> {
    try {
      const userRoles = await this.getCurrentUserContractRoles(
        currentUserId,
        contractAddress
      );

      console.log('[Authorization Check]', {
        currentUserId,
        contractAddress,
        roleToAssign,
        userRoles
      });

      // Normalize the role to assign for comparison
      const normalizedRoleToAssign = roleToAssign.toLowerCase().replace('_role', '');

      // Check for admin roles (global permission)
      if (userRoles.includes('admin') || 
          userRoles.includes('default_admin') ||
          userRoles.includes('owner')) {
        return {
          authorized: true,
          userRoles,
          reason: `User has admin role (roles: ${userRoles.join(', ')})`
        };
      }

      // Check for role_manager role (can assign any role for this contract)
      if (userRoles.includes('role_manager')) {
        return {
          authorized: true,
          userRoles,
          reason: 'User has role_manager role'
        };
      }

      // Check if user has the specific role they're trying to assign
      if (userRoles.includes(normalizedRoleToAssign)) {
        return {
          authorized: true,
          userRoles,
          reason: `User has ${roleToAssign} role`
        };
      }

      // Not authorized
      return {
        authorized: false,
        userRoles,
        reason: `User lacks permission to assign ${roleToAssign} role. User roles: ${userRoles.join(', ') || 'none'}`
      };
    } catch (error) {
      console.error('Error checking role assignment authorization:', error);
      return {
        authorized: false,
        userRoles: [],
        reason: `Authorization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get assignable roles for the current user for a specific contract
   * @param currentUserId - ID of current user
   * @param contractAddress - The contract address
   * @param availableRoles - All possible roles for this contract type (normalized: lowercase, no _ROLE suffix)
   * @returns Filtered list of roles the user can assign
   */
  async getAssignableRoles(
    currentUserId: string,
    contractAddress: string,
    availableRoles: string[]
  ): Promise<string[]> {
    const userRoles = await this.getCurrentUserContractRoles(
      currentUserId,
      contractAddress
    );

    // Admin, owner, and role_manager can assign all roles
    if (userRoles.includes('admin') || 
        userRoles.includes('default_admin') ||
        userRoles.includes('owner') ||
        userRoles.includes('role_manager')) {
      return availableRoles;
    }

    // Otherwise, user can only assign roles they have
    // Normalize both for comparison
    return availableRoles.filter(role => {
      const normalized = role.toLowerCase().replace('_role', '');
      return userRoles.includes(normalized);
    });
  }

  /**
   * Save role assignment to user_contract_roles
   * Includes authorization check to ensure current user has permission
   * 
   * @param userId - Target user receiving the role
   * @param address - User's blockchain address (for reference only, not used for authorization)
   * @param contractAddress - The contract address
   * @param role - The role to assign
   * @param skipAuthCheck - Skip authorization check (use with caution, e.g., for system operations)
   */
  async saveRoleAssignment(
    userId: string,
    address: string,
    contractAddress: string,
    role: string,
    skipAuthCheck: boolean = false
  ): Promise<void> {
    // Authorization check
    if (!skipAuthCheck) {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const authResult = await this.canAssignRole(
        currentUserId,
        contractAddress,
        role
      );

      if (!authResult.authorized) {
        throw new Error(`Unauthorized: ${authResult.reason}`);
      }
    }

    // Get existing contract roles from Authorization Layer
    const { data: existingRoles, error: fetchError } = await supabase
      .from('user_contract_roles')
      .select('contract_roles')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is okay
      console.error('Error fetching existing roles:', fetchError);
      throw new Error(`Failed to fetch existing roles: ${fetchError.message}`);
    }

    // Build updated contract roles
    const contractRoles = existingRoles?.contract_roles || {};
    if (!contractRoles[contractAddress]) {
      contractRoles[contractAddress] = [];
    }
    if (!contractRoles[contractAddress].includes(role)) {
      contractRoles[contractAddress].push(role);
    }

    // Upsert the contract roles in Authorization Layer ONLY
    const { error: upsertError } = await supabase
      .from('user_contract_roles')
      .upsert({
        user_id: userId,
        contract_roles: contractRoles,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error saving role assignment:', upsertError);
      throw new Error(`Failed to save role assignment: ${upsertError.message}`);
    }
  }

  /**
   * Remove role assignment from user_contract_roles
   * Includes authorization check to ensure current user has permission
   * 
   * @param userId - Target user losing the role
   * @param address - User's blockchain address (for reference only, not used for authorization)
   * @param contractAddress - The contract address
   * @param role - The role to remove
   * @param skipAuthCheck - Skip authorization check (use with caution)
   */
  async removeRoleAssignment(
    userId: string,
    address: string,
    contractAddress: string,
    role: string,
    skipAuthCheck: boolean = false
  ): Promise<void> {
    // Authorization check
    if (!skipAuthCheck) {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const authResult = await this.canAssignRole(
        currentUserId,
        contractAddress,
        role
      );

      if (!authResult.authorized) {
        throw new Error(`Unauthorized: ${authResult.reason}`);
      }
    }

    // Get existing contract roles from Authorization Layer
    const { data: existingRoles, error: fetchError } = await supabase
      .from('user_contract_roles')
      .select('contract_roles')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching existing roles:', fetchError);
      throw new Error(`Failed to fetch existing roles: ${fetchError.message}`);
    }

    // Remove role from contract roles
    const contractRoles = existingRoles?.contract_roles || {};
    if (contractRoles[contractAddress]) {
      contractRoles[contractAddress] = contractRoles[contractAddress].filter(
        (r: string) => r !== role
      );
      
      // Remove contract entry if no roles left
      if (contractRoles[contractAddress].length === 0) {
        delete contractRoles[contractAddress];
      }
    }

    // Update the contract roles in Authorization Layer ONLY
    const { error: updateError } = await supabase
      .from('user_contract_roles')
      .update({
        contract_roles: contractRoles,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error removing role assignment:', updateError);
      throw new Error(`Failed to remove role assignment: ${updateError.message}`);
    }
  }
}
