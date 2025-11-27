/**
 * DeploymentFileParser - Parses Foundry deployment JSON files
 * 
 * Reads deployment artifacts from Foundry's output and extracts:
 * - Contract addresses
 * - ABIs
 * - Transaction hashes
 * - Network/chain information
 * 
 * The blockchain is the single source of truth - this service
 * extracts deployment info to sync with the database for tracking.
 */

import { supabase } from '@/infrastructure/database/client';

// ============================================
// Types
// ============================================

export interface FoundryDeploymentRecord {
  hash: string;
  transactionType: string;
  contractName: string;
  contractAddress: string;
  function?: string;
  arguments?: unknown[];
  transaction: {
    type: string;
    from: string;
    gas: string;
    value: string;
    data: string;
    nonce: string;
    accessList?: unknown[];
  };
  additionalContracts?: Array<{
    transactionType: string;
    address: string;
    initCode: string;
  }>;
  isFixedGasLimit: boolean;
}

export interface FoundryDeploymentFile {
  transactions: FoundryDeploymentRecord[];
  receipts: Array<{
    transactionHash: string;
    contractAddress: string;
    status: string;
    blockNumber: string;
    gasUsed: string;
  }>;
  libraries: string[];
  pending: unknown[];
  returns: Record<string, unknown>;
  timestamp: number;
  chain: number;
  multi: boolean;
  commit?: string;
}

export interface ParsedDeployment {
  contractName: string;
  contractAddress: string;
  transactionHash: string;
  deployerAddress: string;
  chainId: number;
  timestamp: Date;
  gasUsed?: string;
  blockNumber?: string;
  abi?: unknown;
  bytecode?: string;
  contractType: string;
  isTemplate: boolean;
  category: string;
}

export interface DeploymentSyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
  deployments: ParsedDeployment[];
}


// ============================================
// Chain ID to Network Mapping
// ============================================

const CHAIN_ID_TO_NETWORK: Record<number, string> = {
  1: 'mainnet',
  11155111: 'sepolia',
  17000: 'hoodi',
  560048: 'hoodi', // Alternate hoodi chain ID
};

const getNetworkFromChainId = (chainId: number): string => {
  return CHAIN_ID_TO_NETWORK[chainId] || `chain-${chainId}`;
};

// ============================================
// Contract Type Detection
// ============================================

const detectContractType = (contractName: string): string => {
  const name = contractName.toLowerCase();
  
  // Map common contract names to types
  const typeMap: Record<string, string> = {
    'erc20factory': 'erc20_factory',
    'erc721factory': 'erc721_factory',
    'erc1155factory': 'erc1155_factory',
    'erc1400factory': 'erc1400_factory',
    'erc3525factory': 'erc3525_factory',
    'erc4626factory': 'erc4626_factory',
    'beaconproxyfactory': 'beacon_proxy_factory',
    'erc20master': 'erc20_master',
    'erc721master': 'erc721_master',
    'erc1155master': 'erc1155_master',
    'erc1400master': 'erc1400_master',
    'erc3525master': 'erc3525_master',
    'erc4626master': 'erc4626_master',
    'erc20beacon': 'erc20_beacon',
    'erc721beacon': 'erc721_beacon',
    'erc1155beacon': 'erc1155_beacon',
    'tokenbeacon': 'token_beacon',
    'upgradeablebeacon': 'upgradeable_beacon',
    'vestingmodule': 'vesting_module',
    'lockingmodule': 'locking_module',
    'compliancemodule': 'compliance_module',
    'documentmodule': 'document_module',
    'snapshotmodule': 'snapshot_module',
    'dividendmodule': 'dividend_module',
    'governancemodule': 'governance_module',
    'extensionfactory': 'extension_factory',
    'tokenregistry': 'token_registry',
    'haircutengine': 'haircut_engine',
  };
  
  // Check exact matches first
  for (const [key, value] of Object.entries(typeMap)) {
    if (name.replace(/[^a-z0-9]/g, '') === key) {
      return value;
    }
  }
  
  // Check partial matches
  if (name.includes('factory')) return `${name.replace('factory', '')}_factory`;
  if (name.includes('beacon')) return `${name.replace('beacon', '')}_beacon`;
  if (name.includes('master')) return `${name.replace('master', '')}_master`;
  if (name.includes('module')) return `${name.replace('module', '')}_module`;
  
  // Convert to snake_case as fallback
  return contractName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/__+/g, '_');
};


const detectCategory = (contractType: string): string => {
  const t = contractType.toLowerCase();
  
  if (t.includes('factory') && !t.includes('extension')) return 'factories';
  if (t.includes('extension') && t.includes('factory')) return 'extensionFactories';
  if (t.includes('beacon')) return 'beacons';
  if (t.includes('master')) return 'masters';
  if (t.includes('module')) return 'modules';
  if (t.includes('registry') || t.includes('engine') || t.includes('deployer')) return 'infrastructure';
  if (t.includes('governance') || t.includes('governor') || t.includes('multisig')) return 'governance';
  
  return 'other';
};

const isTemplateContract = (contractType: string): boolean => {
  const t = contractType.toLowerCase();
  return t.includes('master') || t.includes('beacon');
};

// ============================================
// Main Parser Class
// ============================================

export class DeploymentFileParser {
  /**
   * Parse a Foundry deployment JSON file
   */
  static parseDeploymentFile(
    fileContent: string,
    abiMap?: Map<string, unknown>
  ): ParsedDeployment[] {
    const data: FoundryDeploymentFile = JSON.parse(fileContent);
    const deployments: ParsedDeployment[] = [];
    
    // Create receipt lookup map
    const receiptMap = new Map<string, typeof data.receipts[0]>();
    for (const receipt of data.receipts) {
      receiptMap.set(receipt.transactionHash, receipt);
    }
    
    for (const tx of data.transactions) {
      if (tx.transactionType !== 'CREATE' && tx.transactionType !== 'CREATE2') {
        continue;
      }
      
      const receipt = receiptMap.get(tx.hash);
      const contractType = detectContractType(tx.contractName);
      
      deployments.push({
        contractName: tx.contractName,
        contractAddress: tx.contractAddress,
        transactionHash: tx.hash,
        deployerAddress: tx.transaction.from,
        chainId: data.chain,
        timestamp: new Date(data.timestamp * 1000),
        gasUsed: receipt?.gasUsed,
        blockNumber: receipt?.blockNumber,
        abi: abiMap?.get(tx.contractName),
        contractType,
        isTemplate: isTemplateContract(contractType),
        category: detectCategory(contractType),
      });
    }
    
    return deployments;
  }


  /**
   * Parse a Foundry ABI JSON file (from /out folder)
   */
  static parseAbiFile(fileContent: string): { abi: unknown; bytecode?: string } | null {
    try {
      const data = JSON.parse(fileContent);
      return {
        abi: data.abi,
        bytecode: data.bytecode?.object || data.bytecode,
      };
    } catch {
      return null;
    }
  }

  /**
   * Sync parsed deployments to the contract_masters table
   */
  static async syncToDatabase(
    deployments: ParsedDeployment[],
    environment: string = 'testnet'
  ): Promise<DeploymentSyncResult> {
    const result: DeploymentSyncResult = {
      success: true,
      synced: 0,
      skipped: 0,
      errors: [],
      deployments,
    };

    for (const deployment of deployments) {
      try {
        // Check if contract already exists
        const { data: existing } = await supabase
          .from('contract_masters')
          .select('id')
          .eq('contract_address', deployment.contractAddress.toLowerCase())
          .eq('network', getNetworkFromChainId(deployment.chainId))
          .single();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('contract_masters')
            .update({
              contract_type: deployment.contractType,
              is_template: deployment.isTemplate,
              is_active: true,
              abi: deployment.abi,
              deployment_tx_hash: deployment.transactionHash,
              contract_details: {
                name: deployment.contractName,
                category: deployment.category,
                deployedAt: deployment.timestamp.toISOString(),
                deployedBy: deployment.deployerAddress,
                gasUsed: deployment.gasUsed,
                blockNumber: deployment.blockNumber,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
          result.synced++;
        } else {
          // Insert new record
          const { error } = await supabase
            .from('contract_masters')
            .insert({
              contract_type: deployment.contractType,
              contract_address: deployment.contractAddress.toLowerCase(),
              is_template: deployment.isTemplate,
              is_active: true,
              network: getNetworkFromChainId(deployment.chainId),
              environment,
              abi: deployment.abi,
              version: '1.0.0',
              deployment_tx_hash: deployment.transactionHash,
              contract_details: {
                name: deployment.contractName,
                category: deployment.category,
                deployedAt: deployment.timestamp.toISOString(),
                deployedBy: deployment.deployerAddress,
                gasUsed: deployment.gasUsed,
                blockNumber: deployment.blockNumber,
              },
            });

          if (error) throw error;
          result.synced++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`${deployment.contractName}: ${message}`);
        result.skipped++;
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }
}

export default DeploymentFileParser;
