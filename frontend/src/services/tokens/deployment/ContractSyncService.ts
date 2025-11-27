/**
 * Contract Sync Service
 * 
 * Synchronizes contract_masters database with actual on-chain deployments
 * from hoodi-complete.json and fetches ABIs from foundry output.
 * 
 * Features:
 * - Reads canonical deployment addresses from hoodi-complete.json
 * - Maps contract keys to ABI file paths
 * - Updates database with proper metadata
 * - Handles deduplication and is_active management
 */

import { supabase } from '@/infrastructure/database/client';

// Contract key to ABI file mapping
const CONTRACT_ABI_MAP: Record<string, { abiPath: string; contractType: string; category: string }> = {
  // Token Factories
  erc20Factory: { abiPath: 'ERC20Factory.sol/ERC20Factory.json', contractType: 'erc20_factory', category: 'token_factory' },
  erc721Factory: { abiPath: 'ERC721Factory.sol/ERC721Factory.json', contractType: 'erc721_factory', category: 'token_factory' },
  erc1155Factory: { abiPath: 'ERC1155Factory.sol/ERC1155Factory.json', contractType: 'erc1155_factory', category: 'token_factory' },
  erc1400Factory: { abiPath: 'ERC1400Factory.sol/ERC1400Factory.json', contractType: 'erc1400_factory', category: 'token_factory' },
  erc3525Factory: { abiPath: 'ERC3525Factory.sol/ERC3525Factory.json', contractType: 'erc3525_factory', category: 'token_factory' },
  erc4626Factory: { abiPath: 'ERC4626Factory.sol/ERC4626Factory.json', contractType: 'erc4626_factory', category: 'token_factory' },
  erc20WrapperFactory: { abiPath: 'ERC20WrapperFactory.sol/ERC20WrapperFactory.json', contractType: 'erc20_wrapper_factory', category: 'token_factory' },
  erc721WrapperFactory: { abiPath: 'ERC721WrapperFactory.sol/ERC721WrapperFactory.json', contractType: 'erc721_wrapper_factory', category: 'token_factory' },
  
  // Token Beacons
  erc20Beacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc20_beacon', category: 'token_beacon' },
  erc721Beacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc721_beacon', category: 'token_beacon' },
  erc1155Beacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc1155_beacon', category: 'token_beacon' },
  erc1400Beacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc1400_beacon', category: 'token_beacon' },
  erc3525Beacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc3525_beacon', category: 'token_beacon' },
  erc4626Beacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc4626_beacon', category: 'token_beacon' },
  erc20RebasingBeacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc20_rebasing_beacon', category: 'token_beacon' },
  erc20WrapperBeacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc20_wrapper_beacon', category: 'token_beacon' },
  erc721WrapperBeacon: { abiPath: 'TokenBeacon.sol/TokenBeacon.json', contractType: 'erc721_wrapper_beacon', category: 'token_beacon' },
  
  // Master Implementations
  erc20Master: { abiPath: 'ERC20Master.sol/ERC20Master.json', contractType: 'erc20_master', category: 'master_implementation' },
  erc721Master: { abiPath: 'ERC721Master.sol/ERC721Master.json', contractType: 'erc721_master', category: 'master_implementation' },
  erc1155Master: { abiPath: 'ERC1155Master.sol/ERC1155Master.json', contractType: 'erc1155_master', category: 'master_implementation' },
  erc1400Master: { abiPath: 'ERC1400Master.sol/ERC1400Master.json', contractType: 'erc1400_master', category: 'master_implementation' },
  erc3525Master: { abiPath: 'ERC3525Master.sol/ERC3525Master.json', contractType: 'erc3525_master', category: 'master_implementation' },
  erc4626Master: { abiPath: 'ERC4626Master.sol/ERC4626Master.json', contractType: 'erc4626_master', category: 'master_implementation' },
  erc20RebasingMaster: { abiPath: 'ERC20RebasingMaster.sol/ERC20RebasingMaster.json', contractType: 'erc20_rebasing_master', category: 'master_implementation' },
  erc20WrapperMaster: { abiPath: 'ERC20WrapperMaster.sol/ERC20WrapperMaster.json', contractType: 'erc20_wrapper_master', category: 'master_implementation' },
  erc721WrapperMaster: { abiPath: 'ERC721WrapperMaster.sol/ERC721WrapperMaster.json', contractType: 'erc721_wrapper_master', category: 'master_implementation' },
  
  // Extension Factories
  erc20ExtensionFactory: { abiPath: 'ERC20ExtensionFactory.sol/ERC20ExtensionFactory.json', contractType: 'erc20_extension_factory', category: 'extension_factory' },
  erc721ExtensionFactory: { abiPath: 'ERC721ExtensionFactory.sol/ERC721ExtensionFactory.json', contractType: 'erc721_extension_factory', category: 'extension_factory' },
  erc1155ExtensionFactory: { abiPath: 'ERC1155ExtensionFactory.sol/ERC1155ExtensionFactory.json', contractType: 'erc1155_extension_factory', category: 'extension_factory' },
  erc1400ExtensionFactory: { abiPath: 'ERC1400ExtensionFactory.sol/ERC1400ExtensionFactory.json', contractType: 'erc1400_extension_factory', category: 'extension_factory' },
  erc3525ExtensionFactory: { abiPath: 'ERC3525ExtensionFactory.sol/ERC3525ExtensionFactory.json', contractType: 'erc3525_extension_factory', category: 'extension_factory' },
  erc4626ExtensionFactory: { abiPath: 'ERC4626ExtensionFactory.sol/ERC4626ExtensionFactory.json', contractType: 'erc4626_extension_factory', category: 'extension_factory' },
  universalExtensionFactory: { abiPath: 'UniversalExtensionFactory.sol/UniversalExtensionFactory.json', contractType: 'universal_extension_factory', category: 'extension_factory' },
  
  // ERC20 Extension Modules
  complianceModule: { abiPath: 'ERC20ComplianceModule.sol/ERC20ComplianceModule.json', contractType: 'compliance_module', category: 'extension_module' },
  feeModule: { abiPath: 'ERC20FeeModule.sol/ERC20FeeModule.json', contractType: 'fee_module', category: 'extension_module' },
  flashMintModule: { abiPath: 'ERC20FlashMintModule.sol/ERC20FlashMintModule.json', contractType: 'flash_mint_module', category: 'extension_module' },
  permitModule: { abiPath: 'ERC20PermitModule.sol/ERC20PermitModule.json', contractType: 'permit_module', category: 'extension_module' },
  snapshotModule: { abiPath: 'ERC20SnapshotModule.sol/ERC20SnapshotModule.json', contractType: 'snapshot_module', category: 'extension_module' },
  temporaryApprovalModule: { abiPath: 'ERC20TemporaryApprovalModule.sol/ERC20TemporaryApprovalModule.json', contractType: 'temporary_approval_module', category: 'extension_module' },
  timelockModule: { abiPath: 'ERC20TimelockModule.sol/ERC20TimelockModule.json', contractType: 'timelock_module', category: 'extension_module' },
  vestingModule: { abiPath: 'ERC20VestingModule.sol/ERC20VestingModule.json', contractType: 'vesting_module', category: 'extension_module' },
  votesModule: { abiPath: 'ERC20VotesModule.sol/ERC20VotesModule.json', contractType: 'votes_module', category: 'extension_module' },
  payableModule: { abiPath: 'ERC1363PayableToken.sol/ERC1363PayableToken.json', contractType: 'payable_module', category: 'extension_module' },
  
  // ERC721 Extension Modules
  consecutiveModule: { abiPath: 'ERC721ConsecutiveModule.sol/ERC721ConsecutiveModule.json', contractType: 'consecutive_module', category: 'extension_module' },
  erc721RoyaltyModule: { abiPath: 'ERC721RoyaltyModule.sol/ERC721RoyaltyModule.json', contractType: 'erc721_royalty_module', category: 'extension_module' },
  fractionModule: { abiPath: 'ERC721FractionModule.sol/ERC721FractionModule.json', contractType: 'fraction_module', category: 'extension_module' },
  rentalModule: { abiPath: 'ERC721RentalModule.sol/ERC721RentalModule.json', contractType: 'rental_module', category: 'extension_module' },
  soulboundModule: { abiPath: 'ERC721SoulboundModule.sol/ERC721SoulboundModule.json', contractType: 'soulbound_module', category: 'extension_module' },
  
  // ERC1155 Extension Modules
  erc1155RoyaltyModule: { abiPath: 'ERC1155RoyaltyModule.sol/ERC1155RoyaltyModule.json', contractType: 'erc1155_royalty_module', category: 'extension_module' },
  supplyCapModule: { abiPath: 'ERC1155SupplyCapModule.sol/ERC1155SupplyCapModule.json', contractType: 'supply_cap_module', category: 'extension_module' },
  granularApprovalModule: { abiPath: 'ERC5216GranularApprovalModule.sol/ERC5216GranularApprovalModule.json', contractType: 'granular_approval_module', category: 'extension_module' },
  metadataEventsModule: { abiPath: 'ERC4906MetadataModule.sol/ERC4906MetadataModule.json', contractType: 'metadata_events_module', category: 'extension_module' },
  uriManagementModule: { abiPath: 'ERC1155URIModule.sol/ERC1155URIModule.json', contractType: 'uri_management_module', category: 'extension_module' },
  
  // ERC1400 Extension Modules
  erc1400ControllerModule: { abiPath: 'ERC1400ControllerModule.sol/ERC1400ControllerModule.json', contractType: 'erc1400_controller_module', category: 'extension_module' },
  erc1400DocumentModule: { abiPath: 'ERC1400DocumentModule.sol/ERC1400DocumentModule.json', contractType: 'erc1400_document_module', category: 'extension_module' },
  erc1400TransferRestrictionsModule: { abiPath: 'ERC1400TransferRestrictionsModule.sol/ERC1400TransferRestrictionsModule.json', contractType: 'erc1400_transfer_restrictions_module', category: 'extension_module' },
  documentModule: { abiPath: 'UniversalDocumentModule.sol/UniversalDocumentModule.json', contractType: 'document_module', category: 'extension_module' },
  
  // ERC3525 Extension Modules
  erc3525SlotApprovableModule: { abiPath: 'ERC3525SlotApprovableModule.sol/ERC3525SlotApprovableModule.json', contractType: 'erc3525_slot_approvable_module', category: 'extension_module' },
  erc3525SlotManagerModule: { abiPath: 'ERC3525SlotManagerModule.sol/ERC3525SlotManagerModule.json', contractType: 'erc3525_slot_manager_module', category: 'extension_module' },
  erc3525ValueExchangeModule: { abiPath: 'ERC3525ValueExchangeModule.sol/ERC3525ValueExchangeModule.json', contractType: 'erc3525_value_exchange_module', category: 'extension_module' },
  
  // ERC4626 Extension Modules
  erc4626AsyncVaultModule: { abiPath: 'ERC7540AsyncVaultModule.sol/ERC7540AsyncVaultModule.json', contractType: 'erc4626_async_vault_module', category: 'extension_module' },
  erc4626FeeStrategyModule: { abiPath: 'ERC4626FeeStrategyModule.sol/ERC4626FeeStrategyModule.json', contractType: 'erc4626_fee_strategy_module', category: 'extension_module' },
  erc4626NativeVaultModule: { abiPath: 'ERC7535NativeVaultModule.sol/ERC7535NativeVaultModule.json', contractType: 'erc4626_native_vault_module', category: 'extension_module' },
  erc4626RouterModule: { abiPath: 'ERC4626Router.sol/ERC4626Router.json', contractType: 'erc4626_router_module', category: 'extension_module' },
  erc4626WithdrawalQueueModule: { abiPath: 'ERC4626WithdrawalQueueModule.sol/ERC4626WithdrawalQueueModule.json', contractType: 'erc4626_withdrawal_queue_module', category: 'extension_module' },
  erc4626YieldStrategyModule: { abiPath: 'ERC4626YieldStrategyModule.sol/ERC4626YieldStrategyModule.json', contractType: 'erc4626_yield_strategy_module', category: 'extension_module' },
  multiAssetVaultModule: { abiPath: 'ERC7575MultiAssetVaultModule.sol/ERC7575MultiAssetVaultModule.json', contractType: 'multi_asset_vault_module', category: 'extension_module' },
  
  // Infrastructure
  beaconProxyFactory: { abiPath: 'BeaconProxyFactory.sol/BeaconProxyFactory.json', contractType: 'beacon_proxy_factory', category: 'infrastructure' },
  create2Deployer: { abiPath: 'CREATE2Deployer.sol/CREATE2Deployer.json', contractType: 'create2_deployer', category: 'infrastructure' },
  universalDeployer: { abiPath: 'UniversalDeployer.sol/UniversalDeployer.json', contractType: 'universal_deployer', category: 'infrastructure' },
  extensionRegistry: { abiPath: 'ExtensionRegistry.sol/ExtensionRegistry.json', contractType: 'extension_registry', category: 'infrastructure' },
  factoryRegistry: { abiPath: 'FactoryRegistry.sol/FactoryRegistry.json', contractType: 'factory_registry', category: 'infrastructure' },
  tokenRegistry: { abiPath: 'TokenRegistry.sol/TokenRegistry.json', contractType: 'token_registry', category: 'infrastructure' },
  
  // Governance
  multiSigWallet: { abiPath: 'MultiSigWallet.sol/MultiSigWallet.json', contractType: 'multisig_wallet', category: 'governance' },
  multiSigWalletFactory: { abiPath: 'MultiSigWalletFactory.sol/MultiSigWalletFactory.json', contractType: 'multisig_wallet_factory', category: 'governance' },
  upgradeGovernance: { abiPath: 'UpgradeGovernance.sol/UpgradeGovernance.json', contractType: 'upgrade_governance', category: 'governance' },
  upgradeGovernor: { abiPath: 'UpgradeGovernor.sol/UpgradeGovernor.json', contractType: 'upgrade_governor', category: 'governance' },
  
  // Policy
  policyEngine: { abiPath: 'PolicyEngine.sol/PolicyEngine.json', contractType: 'policy_engine', category: 'policy' },
  policyRegistry: { abiPath: 'PolicyRegistry.sol/PolicyRegistry.json', contractType: 'policy_registry', category: 'policy' },
  haircutEngine: { abiPath: 'HaircutEngine.sol/HaircutEngine.json', contractType: 'haircut_engine', category: 'policy' },
};


// Types
export interface DeploymentJson {
  [key: string]: string; // contractKey: address
}

export interface ContractMasterRecord {
  id?: string;
  network: string;
  environment: string;
  contract_type: string;
  contract_address: string;
  version: string;
  abi_version: string;
  abi: any;
  abi_hash?: string;
  deployed_at?: string;
  deployed_by?: string;
  deployment_tx_hash?: string;
  is_active: boolean;
  deprecated_at?: string;
  deployment_data: {
    contractKey: string;
    abiPath: string;
    category: string;
    syncedAt: string;
    source: 'hoodi-complete.json';
  };
  contract_details?: {
    name?: string;
    standard?: string;
    category?: string;
  };
  initial_owner?: string;
  is_template: boolean;
}

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  deactivated: number;
  errors: string[];
  details: {
    contractKey: string;
    action: 'inserted' | 'updated' | 'skipped' | 'error';
    message: string;
  }[];
}

export class ContractSyncService {
  private static NETWORK = 'hoodi';
  private static ENVIRONMENT = 'testnet';
  private static VERSION = '1.0.0';
  private static ABI_VERSION = '1.0.0';
  
  /**
   * Sync database with hoodi-complete.json deployments
   * @param deploymentData The deployment JSON data
   * @param abiLoader Function to load ABI from file path
   */
  static async syncFromDeployment(
    deploymentData: DeploymentJson,
    abiLoader: (abiPath: string) => Promise<any>
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      totalProcessed: 0,
      inserted: 0,
      updated: 0,
      deactivated: 0,
      errors: [],
      details: [],
    };
    
    try {
      // First, get all existing contracts for this network
      const { data: existingContracts, error: fetchError } = await supabase
        .from('contract_masters')
        .select('id, contract_type, contract_address, is_active')
        .eq('network', this.NETWORK);
      
      if (fetchError) {
        throw new Error(`Failed to fetch existing contracts: ${fetchError.message}`);
      }
      
      // Create a map of existing contracts by lowercase address
      const existingByAddress = new Map<string, typeof existingContracts[0]>();
      existingContracts?.forEach(c => {
        existingByAddress.set(c.contract_address.toLowerCase(), c);
      });
      
      // Track which contract types we're updating (for is_active management)
      const updatedTypes = new Set<string>();
      
      // Process each contract from deployment
      for (const [contractKey, address] of Object.entries(deploymentData)) {
        result.totalProcessed++;
        
        const mapping = CONTRACT_ABI_MAP[contractKey];
        if (!mapping) {
          result.details.push({
            contractKey,
            action: 'skipped',
            message: `No mapping found for contract key: ${contractKey}`,
          });
          continue;
        }
        
        try {
          // Load ABI
          let abi = null;
          try {
            const abiJson = await abiLoader(mapping.abiPath);
            abi = abiJson?.abi || abiJson;
          } catch (abiError) {
            console.warn(`Could not load ABI for ${contractKey}:`, abiError);
          }
          
          // Normalize address (checksummed)
          const normalizedAddress = address.toLowerCase();
          
          // Check if this contract already exists
          const existing = existingByAddress.get(normalizedAddress);
          
          const record: Partial<ContractMasterRecord> = {
            network: this.NETWORK,
            environment: this.ENVIRONMENT,
            contract_type: mapping.contractType,
            contract_address: address, // Keep original checksummed address
            version: this.VERSION,
            abi_version: this.ABI_VERSION,
            abi: abi,
            is_active: true,
            deployment_data: {
              contractKey,
              abiPath: mapping.abiPath,
              category: mapping.category,
              syncedAt: new Date().toISOString(),
              source: 'hoodi-complete.json',
            },
            contract_details: {
              category: mapping.category,
              standard: this.getStandardFromType(mapping.contractType),
            },
            is_template: true,
          };
          
          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('contract_masters')
              .update(record)
              .eq('id', existing.id);
            
            if (updateError) {
              throw new Error(`Update failed: ${updateError.message}`);
            }
            
            result.updated++;
            result.details.push({
              contractKey,
              action: 'updated',
              message: `Updated ${mapping.contractType} at ${address}`,
            });
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('contract_masters')
              .insert(record);
            
            if (insertError) {
              throw new Error(`Insert failed: ${insertError.message}`);
            }
            
            result.inserted++;
            result.details.push({
              contractKey,
              action: 'inserted',
              message: `Inserted ${mapping.contractType} at ${address}`,
            });
          }
          
          updatedTypes.add(mapping.contractType);
          
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          result.errors.push(`${contractKey}: ${errorMsg}`);
          result.details.push({
            contractKey,
            action: 'error',
            message: errorMsg,
          });
        }
      }
      
      // Deactivate old contracts that weren't in this deployment
      for (const contractType of updatedTypes) {
        const { error: deactivateError, count } = await supabase
          .from('contract_masters')
          .update({ 
            is_active: false, 
            deprecated_at: new Date().toISOString() 
          })
          .eq('network', this.NETWORK)
          .eq('contract_type', contractType)
          .eq('is_active', true)
          .not('deployment_data->contractKey', 'in', `(${Object.keys(deploymentData).map(k => `"${k}"`).join(',')})`);
        
        if (!deactivateError && count) {
          result.deactivated += count;
        }
      }
      
      result.success = result.errors.length === 0;
      
    } catch (err) {
      result.success = false;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
    
    return result;
  }
  
  /**
   * Get contract by key from deployment
   */
  static async getContractByKey(contractKey: string): Promise<ContractMasterRecord | null> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', this.NETWORK)
      .eq('is_active', true)
      .contains('deployment_data', { contractKey })
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as ContractMasterRecord;
  }
  
  /**
   * Get all active contracts by category
   */
  static async getContractsByCategory(category: string): Promise<ContractMasterRecord[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', this.NETWORK)
      .eq('is_active', true)
      .contains('deployment_data', { category });
    
    if (error || !data) {
      return [];
    }
    
    return data as ContractMasterRecord[];
  }
  
  /**
   * Get all active contracts
   */
  static async getAllActiveContracts(): Promise<ContractMasterRecord[]> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('*')
      .eq('network', this.NETWORK)
      .eq('is_active', true)
      .order('contract_type');
    
    if (error || !data) {
      return [];
    }
    
    return data as ContractMasterRecord[];
  }
  
  /**
   * Get contract ABI by type
   */
  static async getContractABI(contractType: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('contract_masters')
      .select('abi')
      .eq('network', this.NETWORK)
      .eq('contract_type', contractType)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.abi;
  }
  
  /**
   * Helper: Get standard name from contract type
   */
  private static getStandardFromType(contractType: string): string {
    if (contractType.includes('erc20')) return 'ERC20';
    if (contractType.includes('erc721')) return 'ERC721';
    if (contractType.includes('erc1155')) return 'ERC1155';
    if (contractType.includes('erc1400')) return 'ERC1400';
    if (contractType.includes('erc3525')) return 'ERC3525';
    if (contractType.includes('erc4626')) return 'ERC4626';
    return 'Infrastructure';
  }
  
  /**
   * Get the CONTRACT_ABI_MAP for external use
   */
  static getContractAbiMap() {
    return CONTRACT_ABI_MAP;
  }
  
  /**
   * Verify database is in sync with deployment
   */
  static async verifySync(deploymentData: DeploymentJson): Promise<{
    inSync: boolean;
    missingInDb: string[];
    extraInDb: string[];
    addressMismatches: { key: string; expected: string; actual: string }[];
  }> {
    const result = {
      inSync: true,
      missingInDb: [] as string[],
      extraInDb: [] as string[],
      addressMismatches: [] as { key: string; expected: string; actual: string }[],
    };
    
    // Get all active contracts from DB
    const activeContracts = await this.getAllActiveContracts();
    const dbContractKeys = new Set<string>();
    const dbAddressByKey = new Map<string, string>();
    
    for (const contract of activeContracts) {
      const key = (contract.deployment_data as any)?.contractKey;
      if (key) {
        dbContractKeys.add(key);
        dbAddressByKey.set(key, contract.contract_address.toLowerCase());
      }
    }
    
    // Check for missing/mismatched contracts
    for (const [key, address] of Object.entries(deploymentData)) {
      if (!dbContractKeys.has(key)) {
        result.missingInDb.push(key);
        result.inSync = false;
      } else {
        const dbAddress = dbAddressByKey.get(key);
        if (dbAddress && dbAddress !== address.toLowerCase()) {
          result.addressMismatches.push({
            key,
            expected: address,
            actual: dbAddress,
          });
          result.inSync = false;
        }
      }
    }
    
    // Check for extra contracts in DB
    const deploymentKeys = new Set(Object.keys(deploymentData));
    for (const key of dbContractKeys) {
      if (!deploymentKeys.has(key)) {
        result.extraInDb.push(key);
        result.inSync = false;
      }
    }
    
    return result;
  }
}

export default ContractSyncService;
