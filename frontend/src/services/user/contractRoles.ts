import { supabase } from "@/infrastructure/database/client";

// Smart Contract Role Types
export const CONTRACT_ROLES = {
  // Master Administrator Roles
  DEFAULT_ADMIN_ROLE: 'DEFAULT_ADMIN_ROLE',
  OWNER_ROLE: 'OWNER_ROLE',
  
  // Upgrade & Governance
  UPGRADER_ROLE: 'UPGRADER_ROLE',
  PROPOSER_ROLE: 'PROPOSER_ROLE',
  APPROVER_ROLE: 'APPROVER_ROLE',
  EXECUTOR_ROLE: 'EXECUTOR_ROLE',
  
  // Compliance
  COMPLIANCE_OFFICER_ROLE: 'COMPLIANCE_OFFICER_ROLE',
  CONTROLLER_ROLE: 'CONTROLLER_ROLE',
  
  // Policy & Registry Management
  POLICY_ADMIN_ROLE: 'POLICY_ADMIN_ROLE',
  REGISTRY_ADMIN_ROLE: 'REGISTRY_ADMIN_ROLE',
  REGISTRAR_ROLE: 'REGISTRAR_ROLE',
  
  // Asset Management
  VAULT_MANAGER_ROLE: 'VAULT_MANAGER_ROLE',
  REBALANCER_ROLE: 'REBALANCER_ROLE',
  STRATEGY_MANAGER_ROLE: 'STRATEGY_MANAGER_ROLE',
  
  // Operations
  MINTER_ROLE: 'MINTER_ROLE',
  PAUSER_ROLE: 'PAUSER_ROLE',
  FEE_MANAGER_ROLE: 'FEE_MANAGER_ROLE',
  SNAPSHOT_ROLE: 'SNAPSHOT_ROLE',
  
  // Content
  DOCUMENT_MANAGER_ROLE: 'DOCUMENT_MANAGER_ROLE',
  URI_MANAGER_ROLE: 'URI_MANAGER_ROLE',
  METADATA_UPDATER_ROLE: 'METADATA_UPDATER_ROLE',
  
  // Governance
  GOVERNANCE_ROLE: 'GOVERNANCE_ROLE',
  VESTING_MANAGER_ROLE: 'VESTING_MANAGER_ROLE',
} as const;

export type ContractRoleType = typeof CONTRACT_ROLES[keyof typeof CONTRACT_ROLES];

// Contract role categories for UI organization
export const CONTRACT_ROLE_CATEGORIES = {
  'Master Administrator': [
    CONTRACT_ROLES.DEFAULT_ADMIN_ROLE,
    CONTRACT_ROLES.OWNER_ROLE,
  ],
  'Upgrade & Governance': [
    CONTRACT_ROLES.UPGRADER_ROLE,
    CONTRACT_ROLES.PROPOSER_ROLE,
    CONTRACT_ROLES.APPROVER_ROLE,
    CONTRACT_ROLES.EXECUTOR_ROLE,
  ],
  Compliance: [
    CONTRACT_ROLES.COMPLIANCE_OFFICER_ROLE,
    CONTRACT_ROLES.CONTROLLER_ROLE,
  ],
  'Policy & Registry': [
    CONTRACT_ROLES.POLICY_ADMIN_ROLE,
    CONTRACT_ROLES.REGISTRY_ADMIN_ROLE,
    CONTRACT_ROLES.REGISTRAR_ROLE,
  ],
  'Asset Management': [
    CONTRACT_ROLES.VAULT_MANAGER_ROLE,
    CONTRACT_ROLES.REBALANCER_ROLE,
    CONTRACT_ROLES.STRATEGY_MANAGER_ROLE,
  ],
  Operations: [
    CONTRACT_ROLES.MINTER_ROLE,
    CONTRACT_ROLES.PAUSER_ROLE,
    CONTRACT_ROLES.FEE_MANAGER_ROLE,
    CONTRACT_ROLES.SNAPSHOT_ROLE,
  ],
  Content: [
    CONTRACT_ROLES.DOCUMENT_MANAGER_ROLE,
    CONTRACT_ROLES.URI_MANAGER_ROLE,
    CONTRACT_ROLES.METADATA_UPDATER_ROLE,
  ],
  Governance: [
    CONTRACT_ROLES.GOVERNANCE_ROLE,
    CONTRACT_ROLES.VESTING_MANAGER_ROLE,
  ],
};

// Contract role descriptions
export const CONTRACT_ROLE_DESCRIPTIONS: Record<ContractRoleType, string> = {
  // Master Administrator
  [CONTRACT_ROLES.DEFAULT_ADMIN_ROLE]: 'Master admin with authority to manage all roles (ERC20Master)',
  [CONTRACT_ROLES.OWNER_ROLE]: 'Single administrator with all permissions for master contracts',
  
  // Upgrade & Governance
  [CONTRACT_ROLES.UPGRADER_ROLE]: 'Authorizes contract upgrades and UUPS governance',
  [CONTRACT_ROLES.PROPOSER_ROLE]: 'Creates upgrade proposals for governance review',
  [CONTRACT_ROLES.APPROVER_ROLE]: 'Approves multi-signature operations and upgrade proposals',
  [CONTRACT_ROLES.EXECUTOR_ROLE]: 'Executes approved proposals after timelock period',
  
  // Compliance
  [CONTRACT_ROLES.COMPLIANCE_OFFICER_ROLE]: 'Compliance oversight and enforcement authority',
  [CONTRACT_ROLES.CONTROLLER_ROLE]: 'Financial control and oversight authority',
  
  // Policy & Registry
  [CONTRACT_ROLES.POLICY_ADMIN_ROLE]: 'Creates and manages policies, sets operational limits',
  [CONTRACT_ROLES.REGISTRY_ADMIN_ROLE]: 'Registers tokens and policies in registry',
  [CONTRACT_ROLES.REGISTRAR_ROLE]: 'Registers token deployments and manages lifecycle',
  
  // Asset Management
  [CONTRACT_ROLES.VAULT_MANAGER_ROLE]: 'Vault and treasury management authority',
  [CONTRACT_ROLES.REBALANCER_ROLE]: 'Portfolio rebalancing authority',
  [CONTRACT_ROLES.STRATEGY_MANAGER_ROLE]: 'Investment strategy management',
  
  // Operations
  [CONTRACT_ROLES.MINTER_ROLE]: 'Token minting and creation authority',
  [CONTRACT_ROLES.PAUSER_ROLE]: 'Emergency pause mechanism for transfers',
  [CONTRACT_ROLES.FEE_MANAGER_ROLE]: 'Fee structure management',
  [CONTRACT_ROLES.SNAPSHOT_ROLE]: 'Balance snapshot creation',
  
  // Content
  [CONTRACT_ROLES.DOCUMENT_MANAGER_ROLE]: 'Document management authority',
  [CONTRACT_ROLES.URI_MANAGER_ROLE]: 'URI and metadata endpoint management',
  [CONTRACT_ROLES.METADATA_UPDATER_ROLE]: 'Token metadata update authority',
  
  // Governance
  [CONTRACT_ROLES.GOVERNANCE_ROLE]: 'Governance proposal and voting authority',
  [CONTRACT_ROLES.VESTING_MANAGER_ROLE]: 'Vesting schedule management',
};

// Interface for role contracts
export interface RoleContract {
  id: string;
  role_id: string;
  contract_roles: ContractRoleType[];
  created_at: string;
  updated_at: string;
}

/**
 * Get contract roles for a specific role
 */
export const getRoleContracts = async (roleId: string): Promise<ContractRoleType[]> => {
  try {
    const { data, error } = await supabase
      .from('role_contracts')
      .select('contract_roles')
      .eq('role_id', roleId)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching contract roles for role ${roleId}:`, error);
      throw error;
    }

    if (!data || !data.contract_roles) {
      return [];
    }

    // Ensure contract_roles is an array
    return Array.isArray(data.contract_roles) ? data.contract_roles : [];
  } catch (error) {
    console.error(`Error in getRoleContracts for role ${roleId}:`, error);
    return [];
  }
};

/**
 * Set contract roles for a specific role
 * This will replace any existing contract roles
 */
export const setRoleContracts = async (
  roleId: string,
  contractRoles: ContractRoleType[]
): Promise<boolean> => {
  try {
    const now = new Date().toISOString();

    // Check if role_contracts entry exists
    const { data: existing, error: checkError } = await supabase
      .from('role_contracts')
      .select('id')
      .eq('role_id', roleId)
      .maybeSingle();

    if (checkError) {
      console.error(`Error checking existing contract roles:`, checkError);
      throw checkError;
    }

    if (existing) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('role_contracts')
        .update({
          contract_roles: contractRoles,
          updated_at: now,
        })
        .eq('role_id', roleId);

      if (updateError) {
        console.error(`Error updating contract roles:`, updateError);
        throw updateError;
      }
    } else {
      // Insert new entry
      const { error: insertError } = await supabase
        .from('role_contracts')
        .insert({
          role_id: roleId,
          contract_roles: contractRoles,
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error(`Error inserting contract roles:`, insertError);
        throw insertError;
      }
    }

    return true;
  } catch (error) {
    console.error(`Error in setRoleContracts for role ${roleId}:`, error);
    return false;
  }
};

/**
 * Add a contract role to a role (without removing existing ones)
 */
export const addContractRole = async (
  roleId: string,
  contractRole: ContractRoleType
): Promise<boolean> => {
  try {
    const existingRoles = await getRoleContracts(roleId);
    
    // Don't add if already exists
    if (existingRoles.includes(contractRole)) {
      return true;
    }

    const updatedRoles = [...existingRoles, contractRole];
    return await setRoleContracts(roleId, updatedRoles);
  } catch (error) {
    console.error(`Error in addContractRole for role ${roleId}:`, error);
    return false;
  }
};

/**
 * Remove a contract role from a role
 */
export const removeContractRole = async (
  roleId: string,
  contractRole: ContractRoleType
): Promise<boolean> => {
  try {
    const existingRoles = await getRoleContracts(roleId);
    const updatedRoles = existingRoles.filter(role => role !== contractRole);
    
    return await setRoleContracts(roleId, updatedRoles);
  } catch (error) {
    console.error(`Error in removeContractRole for role ${roleId}:`, error);
    return false;
  }
};

/**
 * Delete all contract roles for a role
 */
export const deleteRoleContracts = async (roleId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('role_contracts')
      .delete()
      .eq('role_id', roleId);

    if (error) {
      console.error(`Error deleting contract roles for role ${roleId}:`, error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Error in deleteRoleContracts for role ${roleId}:`, error);
    return false;
  }
};

/**
 * Get all roles that have a specific contract role
 */
export const getRolesByContractRole = async (
  contractRole: ContractRoleType
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('role_contracts')
      .select('role_id, contract_roles')
      .not('contract_roles', 'is', null);

    if (error) {
      console.error(`Error fetching roles by contract role:`, error);
      throw error;
    }

    if (!data) return [];

    // Filter roles that have the specified contract role
    return data
      .filter(rc => {
        const roles = Array.isArray(rc.contract_roles) ? rc.contract_roles : [];
        return roles.includes(contractRole);
      })
      .map(rc => rc.role_id);
  } catch (error) {
    console.error(`Error in getRolesByContractRole:`, error);
    return [];
  }
};