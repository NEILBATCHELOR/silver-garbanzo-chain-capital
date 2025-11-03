/**
 * Token Role Management Service
 * Handles querying users and their contract roles for role assignment
 */

import { supabase } from '@/infrastructure/database/client';

export interface ProjectUser {
  userId: string;
  userName: string | null;
  userEmail: string;
  address: string;
  blockchain: string;
  organizationId: string | null;
  organizationName: string | null;
  roleName: string | null;
  contractRoles?: string[];
  isActive: boolean;
}

export interface TokenRoleHolder {
  address: string;
  userName?: string;
  userEmail?: string;
  hasRole: boolean;
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
    const { data: projectUsers, error } = await supabase
      .from('project_users')
      .select(`
        user_id,
        users!inner(
          name,
          email
        ),
        user_addresses!inner(
          address,
          blockchain,
          is_active,
          contract_roles
        ),
        user_organization_roles(
          organizations(
            id,
            name
          ),
          roles(
            name
          )
        )
      `)
      .eq('project_id', projectId)
      .eq('user_addresses.is_active', true);

    if (error) {
      console.error('Error fetching project users:', error);
      throw new Error(`Failed to fetch project users: ${error.message}`);
    }

    if (!projectUsers) {
      return [];
    }

    // Flatten the data structure
    return projectUsers.flatMap((pu: any) => {
      if (!pu.user_addresses || pu.user_addresses.length === 0) {
        return [];
      }

      return pu.user_addresses.map((addr: any) => ({
        userId: pu.user_id,
        userName: pu.users?.name || null,
        userEmail: pu.users?.email || '',
        address: addr.address,
        blockchain: addr.blockchain,
        organizationId: pu.user_organization_roles?.[0]?.organizations?.id || null,
        organizationName: pu.user_organization_roles?.[0]?.organizations?.name || null,
        roleName: pu.user_organization_roles?.[0]?.roles?.name || null,
        contractRoles: addr.contract_roles || [],
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
        contractRoles: addr.contract_roles || [],
        isActive: addr.is_active
      }));
    });
  }

  /**
   * Save role assignment to user_contract_roles
   */
  async saveRoleAssignment(
    userId: string,
    address: string,
    contractAddress: string,
    role: string
  ): Promise<void> {
    // First, get existing contract roles
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

    // Upsert the contract roles
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

    // Also update user_addresses.contract_roles for quick access
    const { data: userAddr, error: addrFetchError } = await supabase
      .from('user_addresses')
      .select('contract_roles')
      .eq('user_id', userId)
      .eq('address', address)
      .single();

    if (addrFetchError) {
      console.error('Error fetching user address:', addrFetchError);
      return; // Don't fail the operation if this fails
    }

    const addressContractRoles = userAddr?.contract_roles || [];
    const roleKey = `${contractAddress}:${role}`;
    if (!addressContractRoles.includes(roleKey)) {
      addressContractRoles.push(roleKey);
      
      await supabase
        .from('user_addresses')
        .update({ 
          contract_roles: addressContractRoles,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('address', address);
    }
  }

  /**
   * Remove role assignment from user_contract_roles
   */
  async removeRoleAssignment(
    userId: string,
    address: string,
    contractAddress: string,
    role: string
  ): Promise<void> {
    // Get existing contract roles
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

    // Update the contract roles
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

    // Also update user_addresses.contract_roles
    const { data: userAddr, error: addrFetchError } = await supabase
      .from('user_addresses')
      .select('contract_roles')
      .eq('user_id', userId)
      .eq('address', address)
      .single();

    if (addrFetchError) {
      console.error('Error fetching user address:', addrFetchError);
      return;
    }

    const addressContractRoles = userAddr?.contract_roles || [];
    const roleKey = `${contractAddress}:${role}`;
    const updatedRoles = addressContractRoles.filter((r: string) => r !== roleKey);
    
    await supabase
      .from('user_addresses')
      .update({ 
        contract_roles: updatedRoles,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('address', address);
  }
}
