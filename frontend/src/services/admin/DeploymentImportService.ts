/**
 * Deployment Import Service
 * 
 * Handles parsing Foundry deployment JSON files and syncing to contract_masters table.
 * The blockchain deployment is the single source of truth - this service reads deployment
 * artifacts and updates the database to reflect what's deployed on-chain.
 */

import { supabase } from '@/infrastructure/database/client';

// ============================================
// Types
// ============================================

/** Structure of Foundry deployment JSON files */
export interface FoundryDeploymentFile {
  [contractKey: string]: string; // contractKey -> address mapping
}

/** Mapping from deployment JSON keys to contract types */
interface ContractTypeMapping {
  contractType: string;
  category: 'master' | 'beacon' | 'factory' | 'infrastructure' | 'governance' | 'module';
  standard?: string;
  description: string;
  isTemplate: boolean;
}

/** Parsed contract from deployment file */
export interface ParsedContract {
  contractType: string;
  contractAddress: string;
  category: string;
  standard?: string;
  description: string;
  isTemplate: boolean;
  deploymentKey: string;
}

/** Result of import operation */
export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  contracts: ParsedContract[];
}

// ============================================
// Contract Type Mappings
// ============================================

/**
 * Maps deployment JSON keys to their contract type and metadata.
 * This ensures consistent categorization regardless of deployment file naming.
 */
const CONTRACT_TYPE_MAPPINGS: Record<string, ContractTypeMapping> = {
  // Masters (Template implementations)
  erc20Master: {
    contractType: 'erc20_master',
    category: 'master',
    standard: 'ERC20',
    description: 'ERC-20 Master Implementation',
    isTemplate: true
  },
  erc721Master: {
    contractType: 'erc721_master',
    category: 'master',
    standard: 'ERC721',
    description: 'ERC-721 Master Implementation',
    isTemplate: true
  },
  erc1155Master: {
    contractType: 'erc1155_master',
    category: 'master',
    standard: 'ERC1155',
    description: 'ERC-1155 Master Implementation',
    isTemplate: true
  },
  erc1400Master: {
    contractType: 'erc1400_master',
    category: 'master',
    standard: 'ERC1400',
    description: 'ERC-1400 Security Token Master',
    isTemplate: true
  },
  erc3525Master: {
    contractType: 'erc3525_master',
    category: 'master',
    standard: 'ERC3525',
    description: 'ERC-3525 Semi-Fungible Master',
    isTemplate: true
  },
  erc4626Master: {
    contractType: 'erc4626_master',
    category: 'master',
    standard: 'ERC4626',
    description: 'ERC-4626 Vault Master',
    isTemplate: true
  },
  erc20RebasingMaster: {
    contractType: 'erc20_rebasing_master',
    category: 'master',
    standard: 'ERC20',
    description: 'ERC-20 Rebasing Token Master',
    isTemplate: true
  },

  // Beacons (Upgradeable pointers)
  erc20Beacon: {
    contractType: 'erc20_beacon',
    category: 'beacon',
    standard: 'ERC20',
    description: 'ERC-20 Token Beacon',
    isTemplate: false
  },
  erc721Beacon: {
    contractType: 'erc721_beacon',
    category: 'beacon',
    standard: 'ERC721',
    description: 'ERC-721 Token Beacon',
    isTemplate: false
  },
  erc1155Beacon: {
    contractType: 'erc1155_beacon',
    category: 'beacon',
    standard: 'ERC1155',
    description: 'ERC-1155 Token Beacon',
    isTemplate: false
  },
  erc1400Beacon: {
    contractType: 'erc1400_beacon',
    category: 'beacon',
    standard: 'ERC1400',
    description: 'ERC-1400 Token Beacon',
    isTemplate: false
  },
  erc3525Beacon: {
    contractType: 'erc3525_beacon',
    category: 'beacon',
    standard: 'ERC3525',
    description: 'ERC-3525 Token Beacon',
    isTemplate: false
  },
  erc4626Beacon: {
    contractType: 'erc4626_beacon',
    category: 'beacon',
    standard: 'ERC4626',
    description: 'ERC-4626 Token Beacon',
    isTemplate: false
  },
  erc20RebasingBeacon: {
    contractType: 'erc20_rebasing_beacon',
    category: 'beacon',
    standard: 'ERC20',
    description: 'ERC-20 Rebasing Token Beacon',
    isTemplate: false
  },

  // Factories (Not in typical deployment file but included for completeness)
  erc20Factory: {
    contractType: 'erc20_factory',
    category: 'factory',
    standard: 'ERC20',
    description: 'ERC-20 Token Factory',
    isTemplate: false
  },
  erc721Factory: {
    contractType: 'erc721_factory',
    category: 'factory',
    standard: 'ERC721',
    description: 'ERC-721 Token Factory',
    isTemplate: false
  },

  // Infrastructure
  policyEngine: {
    contractType: 'policy_engine',
    category: 'infrastructure',
    description: 'Policy Engine for operation validation',
    isTemplate: false
  },
  policyRegistry: {
    contractType: 'policy_registry',
    category: 'infrastructure',
    description: 'Policy Registry for rule storage',
    isTemplate: false
  },
  tokenRegistry: {
    contractType: 'token_registry',
    category: 'infrastructure',
    description: 'Token Registry for deployed tokens',
    isTemplate: false
  },

  // Governance
  upgradeGovernor: {
    contractType: 'upgrade_governor',
    category: 'governance',
    description: 'Upgrade Governor for protocol upgrades',
    isTemplate: false
  }
};

// ============================================
// Service Class
// ============================================

export class DeploymentImportService {
  /**
   * Parse a Foundry deployment JSON file
   */
  static parseDeploymentFile(
    fileContent: string,
    network: string,
    environment: string = 'testnet'
  ): ParsedContract[] {
    const deploymentData: FoundryDeploymentFile = JSON.parse(fileContent);
    const contracts: ParsedContract[] = [];

    for (const [key, address] of Object.entries(deploymentData)) {
      const mapping = CONTRACT_TYPE_MAPPINGS[key];
      
      if (mapping) {
        contracts.push({
          contractType: mapping.contractType,
          contractAddress: address,
          category: mapping.category,
          standard: mapping.standard,
          description: mapping.description,
          isTemplate: mapping.isTemplate,
          deploymentKey: key
        });
      } else {
        // Handle unknown contract types - infer from key name
        contracts.push({
          contractType: this.inferContractType(key),
          contractAddress: address,
          category: this.inferCategory(key),
          description: `${key} (auto-detected)`,
          isTemplate: key.toLowerCase().includes('master'),
          deploymentKey: key
        });
      }
    }

    return contracts;
  }

  /**
   * Infer contract type from deployment key
   */
  private static inferContractType(key: string): string {
    // Convert camelCase to snake_case
    return key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  /**
   * Infer category from deployment key
   */
  private static inferCategory(key: string): string {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('master')) return 'master';
    if (lowerKey.includes('beacon')) return 'beacon';
    if (lowerKey.includes('factory')) return 'factory';
    if (lowerKey.includes('registry') || lowerKey.includes('engine')) return 'infrastructure';
    if (lowerKey.includes('governor') || lowerKey.includes('multisig')) return 'governance';
    if (lowerKey.includes('module')) return 'module';
    return 'other';
  }

  /**
   * Check if a contract already exists in the database
   */
  static async contractExists(
    contractAddress: string,
    network: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('contract_masters')
      .select('id')
      .eq('contract_address', contractAddress.toLowerCase())
      .eq('network', network)
      .single();
    
    return !!data;
  }

  /**
   * Import contracts from a deployment file to the database
   */
  static async importDeployment(
    fileContent: string,
    network: string,
    environment: string = 'testnet',
    version: string = '1.0.0',
    options: {
      overwrite?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      contracts: []
    };

    try {
      const contracts = this.parseDeploymentFile(fileContent, network, environment);
      result.contracts = contracts;

      if (options.dryRun) {
        // Just return parsed contracts without saving
        return result;
      }

      for (const contract of contracts) {
        try {
          const exists = await this.contractExists(contract.contractAddress, network);

          if (exists && !options.overwrite) {
            result.skipped++;
            continue;
          }

          const contractData = {
            network,
            environment,
            contract_type: contract.contractType,
            contract_address: contract.contractAddress.toLowerCase(),
            version,
            abi_version: version,
            is_active: true,
            is_template: contract.isTemplate,
            contract_details: {
              name: contract.description,
              category: contract.category,
              standard: contract.standard,
              deploymentKey: contract.deploymentKey
            },
            deployment_data: {
              source: 'foundry_import',
              importedAt: new Date().toISOString()
            }
          };

          if (exists && options.overwrite) {
            // Update existing
            const { error } = await supabase
              .from('contract_masters')
              .update(contractData)
              .eq('contract_address', contract.contractAddress.toLowerCase())
              .eq('network', network);

            if (error) throw error;
            result.updated++;
          } else {
            // Insert new
            const { error } = await supabase
              .from('contract_masters')
              .insert(contractData);

            if (error) throw error;
            result.imported++;
          }

        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`${contract.contractType}: ${message}`);
          result.success = false;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse deployment file';
      result.errors.push(message);
      result.success = false;
    }

    return result;
  }

  /**
   * Get all contracts for a network from the database
   */
  static async getContractsForNetwork(network: string): Promise<ParsedContract[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', network)
      .order('contract_type');

    if (error) throw error;

    return (data || []).map(row => ({
      contractType: row.contract_type,
      contractAddress: row.contract_address,
      category: row.contract_details?.category || 'other',
      standard: row.contract_details?.standard,
      description: row.contract_details?.name || row.contract_type,
      isTemplate: row.is_template,
      deploymentKey: row.contract_details?.deploymentKey || row.contract_type
    }));
  }

  /**
   * Clear all contracts for a network (use with caution!)
   */
  static async clearNetworkContracts(network: string): Promise<void> {
    const { error } = await supabase
      .from('contract_masters')
      .delete()
      .eq('network', network);

    if (error) throw error;
  }

  /**
   * Get deployment statistics for a network
   */
  static async getDeploymentStats(network: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStandard: Record<string, number>;
  }> {
    const contracts = await this.getContractsForNetwork(network);

    const byCategory: Record<string, number> = {};
    const byStandard: Record<string, number> = {};

    for (const contract of contracts) {
      byCategory[contract.category] = (byCategory[contract.category] || 0) + 1;
      if (contract.standard) {
        byStandard[contract.standard] = (byStandard[contract.standard] || 0) + 1;
      }
    }

    return {
      total: contracts.length,
      byCategory,
      byStandard
    };
  }
}

export default DeploymentImportService;
